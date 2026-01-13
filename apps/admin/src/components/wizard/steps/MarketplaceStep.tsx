'use client'

import { useState } from 'react'
import { Store, ArrowLeft, ExternalLink, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate, FeatureLockBadge } from '../FeatureGate'

interface MarketplaceStepProps {
  tenantSlug: string
  initialSelection: {
    storefront: boolean
    etsy: boolean
    ebay: boolean
  }
  connectedPlatforms: {
    etsy: boolean
    ebay: boolean
  }
  currentPlan: string
  onSave: (selection: { storefront: boolean; etsy: boolean; ebay: boolean }) => void
  onBack: () => void
  loading: boolean
}

export function MarketplaceStep({
  tenantSlug,
  initialSelection,
  connectedPlatforms,
  currentPlan,
  onSave,
  onBack,
  loading,
}: MarketplaceStepProps) {
  const [selection, setSelection] = useState(initialSelection)

  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = `${webBaseUrl}/${tenantSlug}`

  // Check if user has marketplace feature access
  const hasMarketplaceAccess = ['maker', 'professional', 'studio', 'pro', 'business'].includes(currentPlan)

  const handleToggle = (platform: 'storefront' | 'etsy' | 'ebay') => {
    if (platform === 'storefront') return // Can't disable storefront

    setSelection(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  const handleSubmit = () => {
    onSave(selection)
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Where should this appear?</h2>
        <p className="mt-2 text-gray-600">Choose where customers can find your item</p>
      </div>

      {/* Storefront - Always enabled */}
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Store className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Your Storefront</h3>
                <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                  Always included
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Your item will be visible in your MadeBuy shop
              </p>
              <Link
                href={storefrontUrl}
                target="_blank"
                className="mt-2 inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800"
              >
                {storefrontUrl}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
            <Check className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* External Marketplaces */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          External Marketplaces
        </h3>

        {/* Etsy */}
        <MarketplaceOption
          name="Etsy"
          description="Reach millions of handmade buyers"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#F1641E">
              <path d="M8.559 5.252c0-.43-.028-.652-.363-.652H5.401c-.217 0-.324.103-.324.324v.652c0 .217.103.324.324.324h.867v5.397H5.401c-.217 0-.324.103-.324.324v.652c0 .217.103.324.324.324h5.073c.217 0 .324-.103.324-.324V11.6c0-.217-.103-.324-.324-.324h-.867V9.053c0-.867.324-1.301 1.191-1.301h.433c.217 0 .324-.103.324-.324v-.976c0-.217-.103-.324-.324-.324h-.433c-.867 0-1.301-.434-1.301-1.301V5.252h.062zM15.775 10.084c-.758 0-1.084-.434-1.084-1.084V7.859c0-.65.326-1.084 1.084-1.084h.434c.217 0 .324-.103.324-.324v-.976c0-.217-.103-.324-.324-.324h-.434c-1.734 0-2.818.976-2.818 2.708V9c0 1.734 1.084 2.708 2.818 2.708h.434c.217 0 .324-.103.324-.324V10.41c0-.217-.103-.324-.324-.324h-.434z"/>
            </svg>
          }
          isConnected={connectedPlatforms.etsy}
          isSelected={selection.etsy}
          hasAccess={hasMarketplaceAccess}
          requiredPlan="maker"
          onToggle={() => handleToggle('etsy')}
        />

        {/* eBay */}
        <MarketplaceOption
          name="eBay"
          description="Reach eBay's massive global audience"
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path fill="#E53238" d="M5.807 8.02c-1.49 0-2.696.595-2.696 2.168 0 1.573 1.206 2.169 2.696 2.169.992 0 1.787-.297 2.382-.892h.05v.793h1.34V8.119H8.24v.793h-.05c-.595-.595-1.39-.892-2.383-.892zm.149 1.192c.893 0 1.587.347 1.587 1.026 0 .678-.694 1.026-1.587 1.026-.893 0-1.587-.348-1.587-1.026 0-.679.694-1.026 1.587-1.026z"/>
              <path fill="#0064D2" d="M11.465 5.225v6.083h.05c.595.595 1.39.893 2.382.893 1.49 0 2.696-.596 2.696-2.17 0-1.572-1.206-2.168-2.696-2.168-.992 0-1.787.297-2.382.893h-.05V5.225h-1.34v6.98h1.34v-.694h.05c.595.595 1.39.892 2.382.892 1.49 0 2.696-.595 2.696-2.168 0-1.574-1.206-2.169-2.696-2.169-.992 0-1.787.298-2.382.893h-.05V5.225h-1.34zm2.283 3.986c.893 0 1.587.348 1.587 1.026 0 .679-.694 1.026-1.587 1.026-.892 0-1.587-.347-1.587-1.026 0-.678.695-1.026 1.587-1.026z"/>
              <path fill="#F5AF02" d="M17.917 10.033c0 1.324.942 2.17 2.283 2.17h.645v-1.193h-.496c-.595 0-.992-.247-.992-.828V9.161h1.488V8.02h-1.488V6.516h-1.44V8.02h-.893v1.14h.893v1.873z"/>
              <path fill="#86B817" d="M21.106 8.02h1.44v4.236h-1.44V8.02z"/>
            </svg>
          }
          isConnected={connectedPlatforms.ebay}
          isSelected={selection.ebay}
          hasAccess={hasMarketplaceAccess}
          requiredPlan="maker"
          onToggle={() => handleToggle('ebay')}
        />
      </div>

      {/* Upgrade prompt for free users */}
      {!hasMarketplaceAccess && (
        <FeatureGate
          feature="Marketplace Integration"
          requiredPlan="maker"
          currentPlan={currentPlan}
          teaserTitle="Expand Your Reach"
          teaserDescription="List your items on Etsy and eBay directly from MadeBuy. Sync inventory, orders, and more."
        >
          <></>
        </FeatureGate>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:from-purple-700 hover:to-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            'Next: Promote It'
          )}
        </button>
      </div>
    </div>
  )
}

interface MarketplaceOptionProps {
  name: string
  description: string
  icon: React.ReactNode
  isConnected: boolean
  isSelected: boolean
  hasAccess: boolean
  requiredPlan: string
  onToggle: () => void
}

function MarketplaceOption({
  name,
  description,
  icon,
  isConnected,
  isSelected,
  hasAccess,
  requiredPlan,
  onToggle,
}: MarketplaceOptionProps) {
  const canUse = hasAccess && isConnected

  return (
    <button
      type="button"
      onClick={canUse ? onToggle : undefined}
      disabled={!canUse}
      className={`w-full rounded-xl border-2 p-5 text-left transition-all ${
        !hasAccess
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
          : !isConnected
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isSelected
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            canUse ? 'bg-white' : 'bg-gray-100'
          }`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${canUse ? 'text-gray-900' : 'text-gray-500'}`}>
                {name}
              </h3>
              {!hasAccess && <FeatureLockBadge requiredPlan={requiredPlan} />}
              {hasAccess && !isConnected && (
                <Link
                  href="/dashboard/connections"
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Connect &rarr;
                </Link>
              )}
            </div>
            <p className={`mt-1 text-sm ${canUse ? 'text-gray-600' : 'text-gray-400'}`}>
              {description}
            </p>
          </div>
        </div>

        {canUse && (
          <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
            isSelected
              ? 'border-purple-500 bg-purple-500 text-white'
              : 'border-gray-300'
          }`}>
            {isSelected && <Check className="h-4 w-4" />}
          </div>
        )}
      </div>
    </button>
  )
}
