/**
 * Key Dates - User-defined important dates for the calendar
 */

export type RepeatFrequency = 'none' | 'weekly' | 'monthly' | 'yearly'

export interface KeyDate {
  id: string
  tenantId: string
  title: string
  description?: string
  date: Date
  color?: string
  repeat: RepeatFrequency
  createdAt: Date
  updatedAt: Date
}

export interface CreateKeyDateInput {
  title: string
  description?: string
  date: Date
  color?: string
  repeat?: RepeatFrequency
}

export type UpdateKeyDateInput = Partial<CreateKeyDateInput>

export interface KeyDateFilters {
  startDate?: Date
  endDate?: Date
  repeat?: RepeatFrequency
}

export interface KeyDateListOptions extends KeyDateFilters {
  limit?: number
  offset?: number
  sortBy?: 'date' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}
