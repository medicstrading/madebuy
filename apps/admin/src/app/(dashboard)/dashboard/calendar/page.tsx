'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from 'lucide-react'
import type { KeyDate, CreateKeyDateInput } from '@madebuy/shared'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const COLOR_OPTIONS = [
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#10B981', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [keyDates, setKeyDates] = useState<KeyDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingKeyDate, setEditingKeyDate] = useState<KeyDate | null>(null)
  const [formData, setFormData] = useState<CreateKeyDateInput>({
    title: '',
    description: '',
    date: new Date(),
    color: '#3B82F6',
    repeat: 'none',
  })

  useEffect(() => {
    fetchKeyDates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  async function fetchKeyDates() {
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const res = await fetch(
        `/api/calendar/key-dates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await res.json()
      setKeyDates(data.keyDates || [])
    } catch (error) {
      console.error('Failed to fetch key dates:', error)
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({ date, isCurrentMonth: true })
    }

    // Next month days
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false })
    }

    return days
  }, [currentDate])

  function getKeyDatesForDay(date: Date) {
    return keyDates.filter((kd) => {
      const kdDate = new Date(kd.date)
      return (
        kdDate.getDate() === date.getDate() &&
        kdDate.getMonth() === date.getMonth() &&
        kdDate.getFullYear() === date.getFullYear()
      )
    })
  }

  function openModal(date: Date, keyDate?: KeyDate) {
    setSelectedDate(date)
    if (keyDate) {
      setEditingKeyDate(keyDate)
      setFormData({
        title: keyDate.title,
        description: keyDate.description || '',
        date: new Date(keyDate.date),
        color: keyDate.color || '#3B82F6',
        repeat: keyDate.repeat,
      })
    } else {
      setEditingKeyDate(null)
      setFormData({
        title: '',
        description: '',
        date: date,
        color: '#3B82F6',
        repeat: 'none',
      })
    }
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingKeyDate) {
        await fetch(`/api/calendar/key-dates/${editingKeyDate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/calendar/key-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      setShowModal(false)
      fetchKeyDates()
    } catch (error) {
      console.error('Failed to save key date:', error)
    }
  }

  async function deleteKeyDate(id: string) {
    if (!confirm('Delete this key date?')) return

    try {
      await fetch(`/api/calendar/key-dates/${id}`, { method: 'DELETE' })
      fetchKeyDates()
    } catch (error) {
      console.error('Failed to delete key date:', error)
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500 mt-1">Track important dates and events</p>
        </div>
        <button
          onClick={() => openModal(new Date())}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Key Date
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={prevMonth}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayKeyDates = getKeyDatesForDay(day.date)

            return (
              <div
                key={index}
                onClick={() => openModal(day.date)}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !day.isCurrentMonth ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isToday(day.date)
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                        : day.isCurrentMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayKeyDates.slice(0, 3).map((kd) => (
                    <div
                      key={kd.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal(day.date, kd)
                      }}
                      className="text-xs px-1.5 py-0.5 rounded truncate"
                      style={{ backgroundColor: `${kd.color}20`, color: kd.color }}
                    >
                      {kd.title}
                    </div>
                  ))}
                  {dayKeyDates.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayKeyDates.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Dates List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Key Dates</h2>
        {keyDates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No key dates this month</p>
        ) : (
          <div className="space-y-2">
            {keyDates
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((kd) => (
                <div
                  key={kd.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: kd.color || '#3B82F6' }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{kd.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(kd.date).toLocaleDateString()}
                        {kd.repeat !== 'none' && ` (${kd.repeat})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModal(new Date(kd.date), kd)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteKeyDate(kd.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingKeyDate ? 'Edit Key Date' : 'Add Key Date'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date instanceof Date ? formData.date.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                  <select
                    value={formData.repeat}
                    onChange={(e) => setFormData({ ...formData, repeat: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="none">No repeat</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {editingKeyDate ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
