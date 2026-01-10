/**
 * Test setup for @madebuy/db package
 * Mocks MongoDB client and provides utilities for testing repositories
 */

import { vi, beforeEach } from 'vitest'
import type { Db, Collection, FindCursor, AggregationCursor, InsertOneResult, UpdateResult, DeleteResult, BulkWriteResult } from 'mongodb'

// Mock data storage (simulates MongoDB collections)
const mockCollections: Record<string, any[]> = {}

// Helper to reset mock collections between tests
export function resetMockCollections() {
  Object.keys(mockCollections).forEach(key => {
    mockCollections[key] = []
  })
}

// Helper to seed mock data
export function seedMockCollection(name: string, data: any[]) {
  mockCollections[name] = [...data]
}

// Helper to get mock collection data
export function getMockCollectionData(name: string): any[] {
  return mockCollections[name] || []
}

// Create a mock cursor that supports MongoDB cursor operations
function createMockCursor(data: any[]): FindCursor<any> {
  let result = [...data]
  let projectionFields: Record<string, number> | null = null
  let sortFields: Record<string, number> | null = null
  let skipCount = 0
  let limitCount = 0

  const cursor = {
    sort: vi.fn((sort: Record<string, number>) => {
      sortFields = sort
      return cursor
    }),
    skip: vi.fn((skip: number) => {
      skipCount = skip
      return cursor
    }),
    limit: vi.fn((limit: number) => {
      limitCount = limit
      return cursor
    }),
    project: vi.fn((projection: Record<string, number>) => {
      projectionFields = projection
      return cursor
    }),
    toArray: vi.fn(async () => {
      let finalResult = [...result]

      // Apply sort
      if (sortFields) {
        const sortKey = Object.keys(sortFields)[0]
        const sortOrder = sortFields[sortKey]
        finalResult.sort((a, b) => {
          if (a[sortKey] < b[sortKey]) return sortOrder * -1
          if (a[sortKey] > b[sortKey]) return sortOrder
          return 0
        })
      }

      // Apply skip and limit
      if (skipCount) {
        finalResult = finalResult.slice(skipCount)
      }
      if (limitCount) {
        finalResult = finalResult.slice(0, limitCount)
      }

      // Apply projection
      if (projectionFields) {
        finalResult = finalResult.map(doc => {
          const projected: Record<string, any> = {}
          Object.keys(projectionFields!).forEach(key => {
            if (projectionFields![key] === 1 && doc[key] !== undefined) {
              projected[key] = doc[key]
            }
          })
          return projected
        })
      }

      return finalResult
    }),
  }

  return cursor as unknown as FindCursor<any>
}

// Create a mock aggregation cursor
function createMockAggregationCursor(data: any[]): AggregationCursor<any> {
  return {
    toArray: vi.fn(async () => data),
  } as unknown as AggregationCursor<any>
}

// Create a mock collection with common MongoDB operations
function createMockCollection(name: string): Collection<any> {
  if (!mockCollections[name]) {
    mockCollections[name] = []
  }

  return {
    insertOne: vi.fn(async (doc: any): Promise<InsertOneResult<any>> => {
      mockCollections[name].push(doc)
      return { acknowledged: true, insertedId: doc._id || doc.id }
    }),

    findOne: vi.fn(async (query: any) => {
      return mockCollections[name].find(doc => {
        return Object.keys(query).every(key => {
          if (key === '$or') {
            return query.$or.some((orQuery: any) =>
              Object.keys(orQuery).every(k => doc[k] === orQuery[k])
            )
          }
          if (typeof query[key] === 'object' && query[key] !== null) {
            if ('$in' in query[key]) {
              return query[key].$in.includes(doc[key])
            }
            if ('$exists' in query[key]) {
              return query[key].$exists ? doc[key] !== undefined : doc[key] === undefined
            }
          }
          return doc[key] === query[key]
        })
      }) || null
    }),

    find: vi.fn((query: any = {}) => {
      let results = mockCollections[name].filter(doc => {
        return Object.keys(query).every(key => {
          if (key === '$or') {
            return query.$or.some((orQuery: any) =>
              Object.keys(orQuery).every(k => doc[k] === orQuery[k])
            )
          }
          if (typeof query[key] === 'object' && query[key] !== null) {
            if ('$in' in query[key]) {
              return query[key].$in.includes(doc[key])
            }
            if ('$ne' in query[key]) {
              return doc[key] !== query[key].$ne
            }
            if ('$exists' in query[key]) {
              return query[key].$exists ? doc[key] !== undefined : doc[key] === undefined
            }
          }
          return doc[key] === query[key]
        })
      })
      return createMockCursor(results)
    }),

    updateOne: vi.fn(async (filter: any, update: any): Promise<UpdateResult<any>> => {
      const index = mockCollections[name].findIndex(doc =>
        Object.keys(filter).every(key => doc[key] === filter[key])
      )
      if (index !== -1) {
        // Helper to set nested path
        const setNestedPath = (obj: any, path: string, value: any) => {
          const parts = path.split('.')
          let current = obj
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            // Handle array index notation (e.g., 'variants.0.stock')
            const arrayIndex = parseInt(part)
            if (!isNaN(arrayIndex)) {
              current = current[arrayIndex]
            } else {
              if (current[part] === undefined) {
                current[part] = {}
              }
              current = current[part]
            }
          }
          const lastPart = parts[parts.length - 1]
          const arrayIndex = parseInt(lastPart)
          if (!isNaN(arrayIndex)) {
            current[arrayIndex] = value
          } else {
            current[lastPart] = value
          }
        }

        // Helper to get nested path value
        const getNestedPath = (obj: any, path: string): any => {
          const parts = path.split('.')
          let current = obj
          for (const part of parts) {
            if (current === undefined || current === null) return undefined
            const arrayIndex = parseInt(part)
            if (!isNaN(arrayIndex)) {
              current = current[arrayIndex]
            } else {
              current = current[part]
            }
          }
          return current
        }

        // Helper to unset nested path
        const unsetNestedPath = (obj: any, path: string) => {
          const parts = path.split('.')
          let current = obj
          for (let i = 0; i < parts.length - 1; i++) {
            if (current === undefined || current === null) return
            current = current[parts[i]]
          }
          if (current !== undefined && current !== null) {
            delete current[parts[parts.length - 1]]
          }
        }

        if (update.$set) {
          Object.keys(update.$set).forEach(key => {
            if (key.includes('.')) {
              setNestedPath(mockCollections[name][index], key, update.$set[key])
            } else {
              mockCollections[name][index][key] = update.$set[key]
            }
          })
        }
        if (update.$inc) {
          Object.keys(update.$inc).forEach(key => {
            if (key.includes('.')) {
              const currentVal = getNestedPath(mockCollections[name][index], key) || 0
              setNestedPath(mockCollections[name][index], key, currentVal + update.$inc[key])
            } else {
              mockCollections[name][index][key] = (mockCollections[name][index][key] || 0) + update.$inc[key]
            }
          })
        }
        if (update.$push) {
          Object.keys(update.$push).forEach(key => {
            if (!mockCollections[name][index][key]) {
              mockCollections[name][index][key] = []
            }
            mockCollections[name][index][key].push(update.$push[key])
          })
        }
        if (update.$pull) {
          Object.keys(update.$pull).forEach(key => {
            if (key.includes('.')) {
              const parts = key.split('.')
              let arr = mockCollections[name][index]
              for (let i = 0; i < parts.length - 1; i++) {
                arr = arr[parts[i]]
              }
              const lastPart = parts[parts.length - 1]
              if (arr && arr[lastPart]) {
                arr[lastPart] = arr[lastPart].filter(
                  (item: any) => item !== update.$pull[key]
                )
              }
            } else {
              if (mockCollections[name][index][key]) {
                mockCollections[name][index][key] = mockCollections[name][index][key].filter(
                  (item: any) => item !== update.$pull[key]
                )
              }
            }
          })
        }
        if (update.$addToSet) {
          Object.keys(update.$addToSet).forEach(key => {
            if (!mockCollections[name][index][key]) {
              mockCollections[name][index][key] = []
            }
            if (!mockCollections[name][index][key].includes(update.$addToSet[key])) {
              mockCollections[name][index][key].push(update.$addToSet[key])
            }
          })
        }
        if (update.$unset) {
          Object.keys(update.$unset).forEach(key => {
            if (key.includes('.')) {
              unsetNestedPath(mockCollections[name][index], key)
            } else {
              delete mockCollections[name][index][key]
            }
          })
        }
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null }
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null }
    }),

    updateMany: vi.fn(async (filter: any, update: any): Promise<UpdateResult<any>> => {
      let modifiedCount = 0
      mockCollections[name].forEach((doc, index) => {
        const matches = Object.keys(filter).every(key => {
          if (typeof filter[key] === 'object' && filter[key] !== null) {
            if ('$exists' in filter[key]) {
              return filter[key].$exists ? doc[key] !== undefined : doc[key] === undefined
            }
            if ('$in' in filter[key]) {
              return filter[key].$in.includes(doc[key])
            }
          }
          return doc[key] === filter[key]
        })
        if (matches) {
          if (update.$set) {
            Object.keys(update.$set).forEach(setKey => {
              mockCollections[name][index][setKey] = update.$set[setKey]
            })
          }
          modifiedCount++
        }
      })
      return { acknowledged: true, matchedCount: modifiedCount, modifiedCount, upsertedCount: 0, upsertedId: null }
    }),

    deleteOne: vi.fn(async (filter: any): Promise<DeleteResult> => {
      const index = mockCollections[name].findIndex(doc =>
        Object.keys(filter).every(key => doc[key] === filter[key])
      )
      if (index !== -1) {
        mockCollections[name].splice(index, 1)
        return { acknowledged: true, deletedCount: 1 }
      }
      return { acknowledged: true, deletedCount: 0 }
    }),

    deleteMany: vi.fn(async (filter: any): Promise<DeleteResult> => {
      const initialLength = mockCollections[name].length
      mockCollections[name] = mockCollections[name].filter(doc =>
        !Object.keys(filter).every(key => doc[key] === filter[key])
      )
      return { acknowledged: true, deletedCount: initialLength - mockCollections[name].length }
    }),

    countDocuments: vi.fn(async (query: any = {}) => {
      return mockCollections[name].filter(doc =>
        Object.keys(query).every(key => doc[key] === query[key])
      ).length
    }),

    aggregate: vi.fn((pipeline: any[]) => {
      // Enhanced aggregation mock
      let results = [...mockCollections[name]]

      pipeline.forEach(stage => {
        if (stage.$match) {
          results = results.filter(doc =>
            Object.keys(stage.$match).every(key => {
              if (typeof stage.$match[key] === 'object' && stage.$match[key] !== null) {
                if ('$exists' in stage.$match[key]) {
                  return stage.$match[key].$exists ? doc[key] !== undefined : doc[key] === undefined
                }
                if ('$in' in stage.$match[key]) {
                  return stage.$match[key].$in.includes(doc[key])
                }
                if ('$lte' in stage.$match[key]) {
                  return doc[key] <= stage.$match[key].$lte
                }
                if ('$gt' in stage.$match[key]) {
                  return doc[key] > stage.$match[key].$gt
                }
                if ('$ne' in stage.$match[key]) {
                  return doc[key] !== stage.$match[key].$ne
                }
              }
              return doc[key] === stage.$match[key]
            })
          )
        }

        if (stage.$group) {
          // Handle $group aggregation
          const groupKey = stage.$group._id
          const groupedData = new Map<string, any>()

          results.forEach(doc => {
            // Get the group key value (handle $field syntax)
            let keyValue: string
            if (typeof groupKey === 'string' && groupKey.startsWith('$')) {
              keyValue = doc[groupKey.substring(1)]
            } else {
              keyValue = groupKey
            }

            if (!groupedData.has(keyValue)) {
              groupedData.set(keyValue, { _id: keyValue })
            }

            const groupDoc = groupedData.get(keyValue)

            // Process accumulator operators
            Object.keys(stage.$group).forEach(field => {
              if (field === '_id') return

              const accumulator = stage.$group[field]
              if (accumulator.$sum !== undefined) {
                if (typeof accumulator.$sum === 'number') {
                  groupDoc[field] = (groupDoc[field] || 0) + accumulator.$sum
                } else if (typeof accumulator.$sum === 'string' && accumulator.$sum.startsWith('$')) {
                  const sumField = accumulator.$sum.substring(1)
                  groupDoc[field] = (groupDoc[field] || 0) + (doc[sumField] || 0)
                }
              }
              if (accumulator.$count) {
                groupDoc[field] = (groupDoc[field] || 0) + 1
              }
            })
          })

          results = Array.from(groupedData.values())
        }

        // Handle $addFields stage
        if (stage.$addFields) {
          results = results.map(doc => {
            const newDoc = { ...doc }
            Object.keys(stage.$addFields).forEach(field => {
              const expr = stage.$addFields[field]
              if (expr.$lte && Array.isArray(expr.$lte)) {
                // Compare two field values
                const [left, right] = expr.$lte.map((v: any) =>
                  typeof v === 'string' && v.startsWith('$') ? doc[v.substring(1)] : v
                )
                newDoc[field] = left <= right
              }
            })
            return newDoc
          })
        }

        // Handle $project stage (simplified)
        if (stage.$project) {
          results = results.map(doc => {
            const newDoc: any = {}
            Object.keys(stage.$project).forEach(field => {
              if (stage.$project[field] === 1) {
                newDoc[field] = doc[field]
              }
            })
            return newDoc
          })
        }

        // Handle $sort stage
        if (stage.$sort) {
          const sortKey = Object.keys(stage.$sort)[0]
          const sortOrder = stage.$sort[sortKey]
          results.sort((a, b) => {
            if (a[sortKey] < b[sortKey]) return sortOrder * -1
            if (a[sortKey] > b[sortKey]) return sortOrder
            return 0
          })
        }
      })

      return createMockAggregationCursor(results)
    }),

    bulkWrite: vi.fn(async (operations: any[]): Promise<BulkWriteResult> => {
      let modifiedCount = 0
      operations.forEach(op => {
        if (op.updateOne) {
          const index = mockCollections[name].findIndex(doc =>
            Object.keys(op.updateOne.filter).every(key => doc[key] === op.updateOne.filter[key])
          )
          if (index !== -1) {
            if (op.updateOne.update.$set) {
              mockCollections[name][index] = { ...mockCollections[name][index], ...op.updateOne.update.$set }
            }
            modifiedCount++
          }
        }
      })
      return {
        ok: 1,
        insertedCount: 0,
        matchedCount: modifiedCount,
        modifiedCount,
        deletedCount: 0,
        upsertedCount: 0,
        upsertedIds: {},
        insertedIds: {}
      } as BulkWriteResult
    }),

    createIndex: vi.fn(async () => 'mock_index'),
  } as unknown as Collection<any>
}

// Create mock database
const mockDb: Db = {
  collection: vi.fn((name: string) => createMockCollection(name)),
} as unknown as Db

// Mock the client module
vi.mock('../client', () => ({
  getDatabase: vi.fn(async () => mockDb),
  serializeMongo: vi.fn(<T>(doc: any): T => {
    if (!doc) return doc
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = doc
    return rest as T
  }),
  serializeMongoArray: vi.fn(<T>(docs: any[]): T[] => {
    return docs.map(doc => {
      if (!doc) return doc
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = doc
      return rest as T
    })
  }),
}))

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  resetMockCollections()
})

// Export mocks for test files
export { mockDb, mockCollections }
