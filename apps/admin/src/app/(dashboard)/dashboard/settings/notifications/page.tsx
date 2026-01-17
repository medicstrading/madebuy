'use client'

import type { TenantNotificationPreferences } from '@madebuy/shared'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  DollarSign,
  Loader2,
  Mail,
  Newspaper,
  Package,
  ShoppingCart,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'

// Default notification preferences
const defaultPreferences: TenantNotificationPreferences = {
  orderNotifications: true,
  lowStockNotifications: true,
  disputeNotifications: true,
  payoutNotifications: true,
  reviewNotifications: true,
  enquiryNotifications: true,
  newsletterUpdates: false,
}

interface NotificationSetting {
  key: keyof TenantNotificationPreferences
  label: string
  description: string
  icon: React.ElementType
  iconColor: string
}

const notificationSettings: NotificationSetting[] = [
  {
    key: 'orderNotifications',
    label: 'New Orders',
    description: 'Receive an email when you get a new order',
    icon: ShoppingCart,
    iconColor: 'text-blue-600',
  },
  {
    key: 'lowStockNotifications',
    label: 'Low Stock Alerts',
    description: 'Get notified when product stock falls below the threshold',
    icon: Package,
    iconColor: 'text-amber-600',
  },
  {
    key: 'disputeNotifications',
    label: 'Payment Disputes',
    description: 'Immediate alerts for chargebacks or payment disputes',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
  },
  {
    key: 'payoutNotifications',
    label: 'Payout Updates',
    description: 'Notifications when payouts are processed to your bank',
    icon: DollarSign,
    iconColor: 'text-green-600',
  },
  {
    key: 'reviewNotifications',
    label: 'New Reviews',
    description: 'Get notified when customers leave product reviews',
    icon: Star,
    iconColor: 'text-yellow-500',
  },
  {
    key: 'enquiryNotifications',
    label: 'Customer Enquiries',
    description: 'Receive emails when customers send enquiries',
    icon: Mail,
    iconColor: 'text-purple-600',
  },
  {
    key: 'newsletterUpdates',
    label: 'MadeBuy Updates',
    description: 'Platform news, tips, and feature announcements',
    icon: Newspaper,
    iconColor: 'text-gray-600',
  },
]

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] =
    useState<TenantNotificationPreferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Track initial settings for unsaved changes detection
  const initialPreferencesRef = useRef<TenantNotificationPreferences | null>(
    null,
  )
  const isDirty =
    initialPreferencesRef.current !== null &&
    JSON.stringify(preferences) !==
      JSON.stringify(initialPreferencesRef.current)

  // Warn user about unsaved changes
  useUnsavedChangesWarning(isDirty)

  // Fetch current preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/notifications')
      if (res.ok) {
        const data = await res.json()
        const fetchedPreferences = data.preferences || defaultPreferences
        setPreferences(fetchedPreferences)
        initialPreferencesRef.current = { ...fetchedPreferences }
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const handleToggle = (key: keyof TenantNotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setMessage(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/tenant/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      })

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Notification preferences saved successfully!',
        })
        // Update initial reference after successful save
        initialPreferencesRef.current = { ...preferences }
      } else {
        const data = await res.json()
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save preferences',
        })
      }
    } catch (_error) {
      setMessage({
        type: 'error',
        text: 'Failed to save preferences. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Notification Preferences
        </h1>
        <p className="mt-1 text-gray-600">
          Choose which email notifications you&apos;d like to receive
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Email Notifications
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Emails will be sent to your account email address
          </p>
        </div>

        {/* Notification toggles */}
        <div className="divide-y divide-gray-100">
          {notificationSettings.map((setting) => {
            const Icon = setting.icon
            const isEnabled = preferences[setting.key]

            return (
              <div
                key={setting.key}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 ${setting.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {setting.label}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {setting.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  type="button"
                  onClick={() => handleToggle(setting.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {/* Save Button */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-800">
          About Email Notifications
        </h4>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>
            Critical notifications (security alerts, account changes) are always
            sent
          </li>
          <li>
            You can unsubscribe from any email by clicking the link at the
            bottom
          </li>
          <li>Changes take effect immediately after saving</li>
        </ul>
      </div>
    </div>
  )
}
