import type {
  CreateKeyDateInput,
  KeyDate,
  KeyDateListOptions,
  UpdateKeyDateInput,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

export async function createKeyDate(
  tenantId: string,
  input: CreateKeyDateInput,
): Promise<KeyDate> {
  const db = await getDatabase()
  const now = new Date()

  // Ensure date is a Date object
  const date =
    typeof input.date === 'string' ? new Date(input.date) : input.date

  const keyDate: KeyDate = {
    id: nanoid(),
    tenantId,
    title: input.title,
    description: input.description,
    date,
    color: input.color,
    repeat: input.repeat || 'none',
    createdAt: now,
    updatedAt: now,
  }

  await db.collection('key_dates').insertOne(keyDate)
  return keyDate
}

export async function getKeyDateById(
  tenantId: string,
  id: string,
): Promise<KeyDate | null> {
  const db = await getDatabase()
  const keyDate = await db.collection('key_dates').findOne({ tenantId, id })
  return keyDate as unknown as KeyDate | null
}

export async function updateKeyDate(
  tenantId: string,
  id: string,
  input: UpdateKeyDateInput,
): Promise<KeyDate | null> {
  const db = await getDatabase()

  const updateData: any = {
    ...input,
    updatedAt: new Date(),
  }

  // Ensure date is a Date object if provided
  if (input.date) {
    updateData.date =
      typeof input.date === 'string' ? new Date(input.date) : input.date
  }

  const result = await db
    .collection('key_dates')
    .findOneAndUpdate(
      { tenantId, id },
      { $set: updateData },
      { returnDocument: 'after' },
    )

  return result as unknown as KeyDate | null
}

export async function deleteKeyDate(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection('key_dates').deleteOne({ tenantId, id })
  return result.deletedCount === 1
}

export async function listKeyDates(
  tenantId: string,
  options: KeyDateListOptions = {},
): Promise<KeyDate[]> {
  const db = await getDatabase()

  const filter: any = { tenantId }

  if (options.repeat) {
    filter.repeat = options.repeat
  }

  // For non-recurring dates, filter by date range
  // For recurring dates, we fetch all and expand in the component
  if (options.startDate || options.endDate) {
    filter.$or = [
      { repeat: { $ne: 'none' } },
      {
        repeat: 'none',
        date: {
          ...(options.startDate && { $gte: options.startDate }),
          ...(options.endDate && { $lte: options.endDate }),
        },
      },
    ]
  }

  const limit = options.limit || 100
  const offset = options.offset || 0
  const sortField = options.sortBy || 'date'
  const sortOrder = options.sortOrder === 'desc' ? -1 : 1

  const keyDates = await db
    .collection('key_dates')
    .find(filter)
    .sort({ [sortField]: sortOrder })
    .skip(offset)
    .limit(limit)
    .toArray()

  return keyDates as unknown as KeyDate[]
}

export async function getAllKeyDates(tenantId: string): Promise<KeyDate[]> {
  const db = await getDatabase()

  const keyDates = await db
    .collection('key_dates')
    .find({ tenantId })
    .sort({ date: 1 })
    .toArray()

  return keyDates as unknown as KeyDate[]
}
