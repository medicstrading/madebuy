'use client'

import {
  Bell,
  Check,
  CreditCard,
  Globe,
  Key,
  Mail,
  Save,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'

interface PlatformSettings {
  general: {
    platformName: string
    supportEmail: string
    maintenanceMode: boolean
    allowNewSignups: boolean
  }
  pricing: {
    tiers: {
      name: string
      price: number
      interval: 'month' | 'year'
      features: string[]
      limits: {
        products: number
        orders: number
        storage: number
      }
    }[]
  }
  features: {
    socialPublishing: boolean
    aiCaptions: boolean
    customDomains: boolean
    apiAccess: boolean
    advancedAnalytics: boolean
  }
  notifications: {
    emailOnNewSignup: boolean
    emailOnChurn: boolean
    slackWebhook: string
    alertThresholds: {
      errorRate: number
      churnRate: number
    }
  }
}

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        enabled ? 'bg-primary' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="pr-4">
        <p className="font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

export function SettingsContent() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<PlatformSettings>({
    general: {
      platformName: 'MadeBuy',
      supportEmail: 'support@madebuy.com.au',
      maintenanceMode: false,
      allowNewSignups: true,
    },
    pricing: {
      tiers: [
        {
          name: 'Free',
          price: 0,
          interval: 'month',
          features: ['Up to 10 products', 'Basic storefront'],
          limits: { products: 10, orders: 50, storage: 100 },
        },
        {
          name: 'Maker',
          price: 15,
          interval: 'month',
          features: ['Unlimited products', 'Social publishing', 'Custom domain'],
          limits: { products: -1, orders: -1, storage: 1000 },
        },
        {
          name: 'Professional',
          price: 29,
          interval: 'month',
          features: ['Everything in Maker', 'AI captions', 'Advanced analytics'],
          limits: { products: -1, orders: -1, storage: 5000 },
        },
        {
          name: 'Studio',
          price: 59,
          interval: 'month',
          features: ['Everything in Pro', 'API access', 'Priority support'],
          limits: { products: -1, orders: -1, storage: 20000 },
        },
      ],
    },
    features: {
      socialPublishing: true,
      aiCaptions: true,
      customDomains: true,
      apiAccess: true,
      advancedAnalytics: true,
    },
    notifications: {
      emailOnNewSignup: true,
      emailOnChurn: true,
      slackWebhook: '',
      alertThresholds: {
        errorRate: 5,
        churnRate: 10,
      },
    },
  })

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const json = await res.json()
        setSettings(json)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateGeneral = (key: keyof PlatformSettings['general'], value: any) => {
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, [key]: value },
    }))
  }

  const updateFeature = (key: keyof PlatformSettings['features'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }))
  }

  const updateNotification = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar
          user={
            session?.user
              ? {
                  name: session.user.name,
                  email: session.user.email,
                  role: (session.user as any).role,
                }
              : undefined
          }
        />
        <main className="ml-64 flex-1 p-8">
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 skeleton rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role,
              }
            : undefined
        }
      />

      <main className="ml-64 flex-1 p-8">
        <Header
          title="Settings"
          subtitle="Manage platform configuration"
          actions={
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                saved
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
                saving && 'opacity-50 cursor-not-allowed',
              )}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </>
              )}
            </button>
          }
        />

        <div className="space-y-6">
          {/* General Settings */}
          <SettingSection
            icon={Settings}
            title="General"
            description="Basic platform configuration"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Platform Name"
                value={settings.general.platformName}
                onChange={(v) => updateGeneral('platformName', v)}
              />
              <InputField
                label="Support Email"
                type="email"
                value={settings.general.supportEmail}
                onChange={(v) => updateGeneral('supportEmail', v)}
              />
            </div>
            <div className="mt-6 space-y-0">
              <SettingRow
                label="Allow New Signups"
                description="Enable or disable new user registrations"
              >
                <Toggle
                  enabled={settings.general.allowNewSignups}
                  onChange={(v) => updateGeneral('allowNewSignups', v)}
                />
              </SettingRow>
              <SettingRow
                label="Maintenance Mode"
                description="Put the platform in maintenance mode"
              >
                <Toggle
                  enabled={settings.general.maintenanceMode}
                  onChange={(v) => updateGeneral('maintenanceMode', v)}
                />
              </SettingRow>
            </div>
          </SettingSection>

          {/* Feature Flags */}
          <SettingSection
            icon={Shield}
            title="Feature Flags"
            description="Enable or disable platform features globally"
          >
            <div className="space-y-0">
              <SettingRow
                label="Social Publishing"
                description="Allow tenants to publish to social media"
              >
                <Toggle
                  enabled={settings.features.socialPublishing}
                  onChange={(v) => updateFeature('socialPublishing', v)}
                />
              </SettingRow>
              <SettingRow
                label="AI Captions"
                description="Enable AI-generated product descriptions"
              >
                <Toggle
                  enabled={settings.features.aiCaptions}
                  onChange={(v) => updateFeature('aiCaptions', v)}
                />
              </SettingRow>
              <SettingRow
                label="Custom Domains"
                description="Allow tenants to use custom domains"
              >
                <Toggle
                  enabled={settings.features.customDomains}
                  onChange={(v) => updateFeature('customDomains', v)}
                />
              </SettingRow>
              <SettingRow
                label="API Access"
                description="Enable API access for integrations"
              >
                <Toggle
                  enabled={settings.features.apiAccess}
                  onChange={(v) => updateFeature('apiAccess', v)}
                />
              </SettingRow>
              <SettingRow
                label="Advanced Analytics"
                description="Provide detailed analytics to tenants"
              >
                <Toggle
                  enabled={settings.features.advancedAnalytics}
                  onChange={(v) => updateFeature('advancedAnalytics', v)}
                />
              </SettingRow>
            </div>
          </SettingSection>

          {/* Subscription Tiers */}
          <SettingSection
            icon={CreditCard}
            title="Subscription Tiers"
            description="Configure pricing and plan limits"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {settings.pricing.tiers.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <h4 className="font-semibold text-foreground mb-1">{tier.name}</h4>
                  <p className="text-2xl font-bold text-primary mb-3">
                    ${tier.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{tier.interval}
                    </span>
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              To update pricing, modify the Stripe products and update environment variables.
            </p>
          </SettingSection>

          {/* Notifications */}
          <SettingSection
            icon={Bell}
            title="Notifications"
            description="Configure admin alerts and notifications"
          >
            <div className="space-y-4 mb-6">
              <InputField
                label="Slack Webhook URL"
                value={settings.notifications.slackWebhook}
                onChange={(v) => updateNotification('slackWebhook', v)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div className="space-y-0">
              <SettingRow
                label="Email on New Signup"
                description="Receive email when a new tenant signs up"
              >
                <Toggle
                  enabled={settings.notifications.emailOnNewSignup}
                  onChange={(v) => updateNotification('emailOnNewSignup', v)}
                />
              </SettingRow>
              <SettingRow
                label="Email on Churn"
                description="Receive email when a tenant cancels"
              >
                <Toggle
                  enabled={settings.notifications.emailOnChurn}
                  onChange={(v) => updateNotification('emailOnChurn', v)}
                />
              </SettingRow>
            </div>
          </SettingSection>
        </div>
      </main>
    </div>
  )
}
