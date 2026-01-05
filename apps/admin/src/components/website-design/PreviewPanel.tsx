'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, RefreshCw, Monitor, Smartphone, Tablet } from 'lucide-react'

interface PreviewPanelProps {
  tenantSlug?: string
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

export function PreviewPanel({ tenantSlug }: PreviewPanelProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const previewUrl = tenantSlug ? `${webBaseUrl}/${tenantSlug}` : webBaseUrl

  const deviceWidths: Record<DeviceMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  const handleRefresh = () => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Preview Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Preview</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Mode Buttons */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded ${
                deviceMode === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Desktop view"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded ${
                deviceMode === 'tablet' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Tablet view"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded ${
                deviceMode === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Refresh preview"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Open in New Tab */}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <div
          className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
          style={{
            width: deviceWidths[deviceMode],
            maxWidth: '100%',
            height: deviceMode === 'mobile' ? '667px' : deviceMode === 'tablet' ? '1024px' : '100%',
            minHeight: '500px',
          }}
        >
          <iframe
            key={refreshKey}
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            title="Store preview"
          />
        </div>
      </div>
    </div>
  )
}
