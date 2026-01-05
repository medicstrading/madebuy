'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Palette,
  Globe,
  ArrowRight,
  Check,
  AlertCircle,
  Sparkles,
  Type,
  Image as ImageIcon,
  Monitor,
  Tablet,
  Smartphone,
  Navigation,
  Layout,
  ExternalLink,
} from 'lucide-react'
import type { ExtractedDesign, TypographyPreset, WebsiteTemplate } from '@madebuy/shared'

type Step = 'choice' | 'url-input' | 'scanning' | 'preview'
type DeviceView = 'desktop' | 'tablet' | 'mobile'

const TYPOGRAPHY_NAMES: Record<TypographyPreset, string> = {
  modern: 'Modern',
  classic: 'Classic',
  elegant: 'Elegant',
  bold: 'Bold',
  minimal: 'Minimal',
}

const TEMPLATE_NAMES: Record<WebsiteTemplate, string> = {
  'classic-store': 'Classic Store',
  'landing-page': 'Landing Page',
  'portfolio': 'Portfolio',
  'magazine': 'Magazine',
}

export default function DesignImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choice')
  const [url, setUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [design, setDesign] = useState<ExtractedDesign | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop')

  const handleStartFresh = () => {
    router.push('/dashboard/website-design')
  }

  const handleImportChoice = () => {
    setStep('url-input')
  }

  const handleScan = async () => {
    if (!url.trim()) {
      setError('Please enter a website URL')
      return
    }

    // Add protocol if missing
    let scanUrl = url.trim()
    if (!scanUrl.startsWith('http://') && !scanUrl.startsWith('https://')) {
      scanUrl = 'https://' + scanUrl
    }

    setError(null)
    setIsScanning(true)
    setStep('scanning')

    try {
      const response = await fetch('/api/onboarding/design/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl }),
      })

      const data = await response.json()

      if (data.status === 'complete' && data.design) {
        setDesign(data.design)

        // Generate preview
        try {
          const previewResponse = await fetch('/api/onboarding/design/preview', {
            method: 'POST',
          })
          const previewData = await previewResponse.json()
          if (previewData.success && previewData.previewUrl) {
            setPreviewUrl(previewData.previewUrl)
          }
        } catch (previewErr) {
          console.warn('Preview generation failed:', previewErr)
          // Continue without preview - not critical
        }

        setStep('preview')
      } else {
        setError(data.error || 'Failed to scan website')
        setStep('url-input')
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError('An error occurred while scanning. Please try again.')
      setStep('url-input')
    } finally {
      setIsScanning(false)
    }
  }

  const getDeviceWidth = () => {
    switch (deviceView) {
      case 'mobile': return 375
      case 'tablet': return 768
      default: return '100%'
    }
  }

  const handleAccept = async () => {
    setIsApplying(true)
    try {
      const response = await fetch('/api/onboarding/design/accept', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/dashboard/website-design')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to apply design')
      }
    } catch (err) {
      console.error('Accept error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleDecline = async () => {
    try {
      await fetch('/api/onboarding/design/decline', {
        method: 'POST',
      })
      router.push('/dashboard/website-design')
    } catch (err) {
      console.error('Decline error:', err)
      router.push('/dashboard/website-design')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Palette className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Design Your Website
        </h1>
        <p className="text-lg text-gray-600">
          {step === 'choice' && 'How would you like to get started?'}
          {step === 'url-input' && 'Enter your existing website URL'}
          {step === 'scanning' && 'Scanning your website...'}
          {step === 'preview' && 'Here\'s what we found'}
        </p>
      </div>

      {/* Step: Choice */}
      {step === 'choice' && (
        <div className="space-y-4">
          <button
            onClick={handleStartFresh}
            className="w-full flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200">
              <Sparkles className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                Start Fresh
              </h3>
              <p className="text-gray-600">
                Choose a template and customize your storefront from scratch
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
          </button>

          <button
            onClick={handleImportChoice}
            className="w-full flex items-center gap-4 p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200">
              <Globe className="h-7 w-7 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">
                Import My Website
              </h3>
              <p className="text-gray-600">
                Scan your existing website to extract colors, fonts, and logo
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
          </button>
        </div>
      )}

      {/* Step: URL Input */}
      {step === 'url-input' && (
        <div className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="www.example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <p className="mt-2 text-sm text-gray-500">
              We&apos;ll scan this website to extract your brand colors, fonts, and logo
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('choice')}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleScan}
              disabled={!url.trim()}
              className="flex-1 px-4 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Scan Website
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step: Scanning */}
      {step === 'scanning' && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-6" />
          <p className="text-gray-600 mb-2">Scanning {url}...</p>
          <p className="text-sm text-gray-500">
            Extracting colors, fonts, and logo
          </p>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && design && (
        <div className="space-y-6">
          {/* Live Preview */}
          {previewUrl && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-purple-600" />
                  Live Preview
                </h3>
                <div className="flex items-center gap-2">
                  {/* Device Toggle */}
                  <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setDeviceView('desktop')}
                      className={`p-1.5 rounded ${deviceView === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                      title="Desktop"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeviceView('tablet')}
                      className={`p-1.5 rounded ${deviceView === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                      title="Tablet"
                    >
                      <Tablet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeviceView('mobile')}
                      className={`p-1.5 rounded ${deviceView === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-100'}`}
                      title="Mobile"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Open in new tab
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <div className="bg-gray-100 p-4 flex justify-center" style={{ minHeight: 400 }}>
                <div
                  className="bg-white shadow-lg transition-all duration-300 overflow-hidden"
                  style={{
                    width: getDeviceWidth(),
                    height: 500,
                    borderRadius: deviceView !== 'desktop' ? 16 : 0,
                  }}
                >
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Design Preview"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Design Details Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Colors */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-purple-600" />
                Colors
              </h3>
              <div className="flex gap-4">
                {design.colors.primary ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-md border border-gray-200"
                      style={{ backgroundColor: design.colors.primary }}
                    />
                    <span className="text-xs text-gray-600 uppercase">{design.colors.primary}</span>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs">No primary color</p>
                )}
                {design.colors.accent && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-md border border-gray-200"
                      style={{ backgroundColor: design.colors.accent }}
                    />
                    <span className="text-xs text-gray-600 uppercase">{design.colors.accent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Typography */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Type className="h-4 w-4 text-purple-600" />
                Typography
              </h3>
              <p className="text-sm text-gray-700">
                {design.typography.matchedPreset
                  ? TYPOGRAPHY_NAMES[design.typography.matchedPreset]
                  : 'Modern (default)'}
              </p>
              {design.typography.detectedFonts.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {design.typography.detectedFonts.slice(0, 3).join(', ')}
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-purple-600" />
                Navigation
              </h3>
              {design.navigation.items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {design.navigation.items.slice(0, 5).map((item, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                      {item.label}
                    </span>
                  ))}
                  {design.navigation.items.length > 5 && (
                    <span className="text-xs text-gray-400">
                      +{design.navigation.items.length - 5} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">No navigation detected</p>
              )}
            </div>

            {/* Template */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Layout className="h-4 w-4 text-purple-600" />
                Recommended Template
              </h3>
              <p className="text-sm text-gray-700">
                {TEMPLATE_NAMES[design.templateMatch.recommended]}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(design.templateMatch.confidence * 100)}% confidence
              </p>
            </div>

            {/* Logo */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                Logo
              </h3>
              {design.logo?.downloadedMediaId ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">Imported</span>
                </div>
              ) : design.logo?.sourceUrl ? (
                <p className="text-xs text-gray-500">Found but not imported</p>
              ) : (
                <p className="text-gray-400 text-xs">Not detected</p>
              )}
            </div>

            {/* Sections */}
            <div className="p-5 rounded-xl border border-gray-200 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Layout className="h-4 w-4 text-purple-600" />
                Detected Sections
              </h3>
              {design.sections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {design.sections.map((section, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                      {section.type}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">None detected</p>
              )}
            </div>
          </div>

          {/* Limitations */}
          {design.limitations.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                Notes
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {design.limitations.map((limitation, index) => (
                  <li key={index}>• {limitation}</li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDecline}
              disabled={isApplying}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Start Fresh Instead
            </button>
            <button
              onClick={handleAccept}
              disabled={isApplying}
              className="flex-1 px-4 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept & Continue
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Back to onboarding link */}
      {step === 'choice' && (
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/dashboard/onboarding')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Back to setup overview
          </button>
        </div>
      )}
    </div>
  )
}
