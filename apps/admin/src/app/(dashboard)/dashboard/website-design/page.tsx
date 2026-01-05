'use client'

import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, Globe, Sparkles, FileText, Palette, Menu } from 'lucide-react'
import { DomainTab } from '@/components/website-design/tabs/DomainTab'
import { TemplateTab } from '@/components/website-design/tabs/TemplateTab'
import { ContentTab } from '@/components/website-design/tabs/ContentTab'
import { BrandingTab } from '@/components/website-design/tabs/BrandingTab'
import { HeaderFooterTab } from '@/components/website-design/tabs/HeaderFooterTab'
import { CustomBuilderView } from '@/components/website-design/custom-builder/CustomBuilderView'
import type { Tenant, WebsitePage, WebsiteTemplate, HeaderConfig, FooterConfig } from '@madebuy/shared'
import type { TypographyPreset } from '@madebuy/shared/src/constants/typography'
import { getDefaultPages, createCustomPage } from '@madebuy/shared/src/types/template'

type TabId = 'domain' | 'template' | 'content' | 'branding' | 'header-footer'
type ViewMode = 'tabs' | 'custom-builder'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'domain', label: 'Your Domain', icon: Globe },
  { id: 'template', label: 'Choose Your Look', icon: Sparkles },
  { id: 'content', label: 'Your Content', icon: FileText },
  { id: 'branding', label: 'Your Brand', icon: Palette },
  { id: 'header-footer', label: 'Header & Footer', icon: Menu },
]

export default function WebsiteDesignPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('tabs')
  const [activeTab, setActiveTab] = useState<TabId>('domain')

  // Template & pages
  const [currentTemplate, setCurrentTemplate] = useState<WebsiteTemplate | null>(null)
  const [pages, setPages] = useState<WebsitePage[]>([])

  // Branding
  const [logoMediaId, setLogoMediaId] = useState<string>()
  const [logoUrl, setLogoUrl] = useState<string>()
  const [primaryColor, setPrimaryColor] = useState('#4F46E5')
  const [accentColor, setAccentColor] = useState('#10B981')
  const [typography, setTypography] = useState<TypographyPreset>('modern')

  // Header & Footer
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    style: 'default',
    sticky: true,
    showSocialIcons: false,
  })
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({
    style: 'default',
    showPaymentMethods: true,
    showSocialLinks: true,
    showPoweredBy: true,
  })

  // Load tenant data
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)

          // Load existing website design data
          const wd = data.websiteDesign
          if (wd) {
            if (wd.template) {
              setCurrentTemplate(wd.template)
            }
            if (wd.pages?.length) {
              setPages(wd.pages)
              // If we have pages and template, go to content tab
              if (wd.template) {
                setActiveTab('content')
              }
            }
            if (wd.primaryColor) setPrimaryColor(wd.primaryColor)
            if (wd.accentColor) setAccentColor(wd.accentColor)
            if (wd.typography) setTypography(wd.typography)
            if (wd.logoMediaId) setLogoMediaId(wd.logoMediaId)
            if (wd.logoUrl) setLogoUrl(wd.logoUrl)
            if (wd.headerConfig) setHeaderConfig(wd.headerConfig)
            if (wd.footerConfig) setFooterConfig(wd.footerConfig)
          }
        }
      } catch (error) {
        console.error('Failed to load tenant:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Save changes
  const saveDesign = async (updates: Record<string, unknown>) => {
    if (!tenant) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/website-design', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Template selection
  const handleSelectTemplate = (template: WebsiteTemplate, templatePages: WebsitePage[]) => {
    setCurrentTemplate(template)
    setPages(templatePages)
    saveDesign({ template, pages: templatePages })
    setActiveTab('content')
  }

  // Build custom mode
  const handleBuildCustom = () => {
    // Start with a basic home page
    const homePage = createCustomPage('home', 'Home')
    setPages([homePage])
    setCurrentTemplate(null)
    setViewMode('custom-builder')
  }

  const handleBackToTemplates = () => {
    setViewMode('tabs')
    setActiveTab('template')
  }

  const handleContinueToContent = () => {
    saveDesign({ pages, template: null })
    setViewMode('tabs')
    setActiveTab('content')
  }

  // Pages changes
  const handlePagesChange = (newPages: WebsitePage[]) => {
    setPages(newPages)
    saveDesign({ pages: newPages })
  }

  // Branding changes
  const handleLogoChange = (mediaId: string, url: string) => {
    setLogoMediaId(mediaId)
    setLogoUrl(url)
    saveDesign({ logoMediaId: mediaId, logoUrl: url })
  }

  const handleColorsChange = (primary: string, accent: string) => {
    setPrimaryColor(primary)
    setAccentColor(accent)
    saveDesign({ primaryColor: primary, accentColor: accent })
  }

  const handleTypographyChange = (newTypography: TypographyPreset) => {
    setTypography(newTypography)
    saveDesign({ typography: newTypography })
  }

  // Header/Footer changes
  const handleHeaderChange = (config: HeaderConfig) => {
    setHeaderConfig(config)
    saveDesign({ headerConfig: config })
  }

  const handleFooterChange = (config: FooterConfig) => {
    setFooterConfig(config)
    saveDesign({ footerConfig: config })
  }

  // Get storefront URL
  const webBaseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'
  const storefrontUrl = tenant?.slug ? `${webBaseUrl}/${tenant.slug}` : '#'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Custom builder view
  if (viewMode === 'custom-builder') {
    return (
      <div className="min-h-screen bg-gray-50/50 -m-6 p-6">
        <CustomBuilderView
          pages={pages}
          onPagesChange={setPages}
          onBackToTemplates={handleBackToTemplates}
          onContinueToContent={handleContinueToContent}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 -m-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-serif text-gray-900">Website Design</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Build and customize your beautiful storefront
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
{tenant?.slug ? (
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Store
              </a>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                <ExternalLink className="h-4 w-4" />
                Preview Store
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="flex gap-1">
            {TABS.map((tab, index) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const isCompleted = (() => {
                switch (tab.id) {
                  case 'domain':
                    return !!tenant?.customDomain
                  case 'template':
                    return !!currentTemplate || pages.length > 0
                  case 'content':
                    return pages.some(p =>
                      p.sections.some(s => s.settings?.isContentComplete)
                    )
                  case 'branding':
                    return !!logoUrl || primaryColor !== '#4F46E5'
                  case 'header-footer':
                    return headerConfig.style !== 'default' || footerConfig.style !== 'default'
                  default:
                    return false
                }
              })()

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 -mb-px transition-colors
                    ${isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
                    ${isActive
                      ? 'bg-indigo-100 text-indigo-600'
                      : isCompleted
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {isCompleted && !isActive ? '✓' : index + 1}
                  </span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'domain' && (
          <DomainTab tenant={tenant} />
        )}

        {activeTab === 'template' && (
          <TemplateTab
            currentTemplate={currentTemplate}
            onSelectTemplate={handleSelectTemplate}
            onBuildCustom={handleBuildCustom}
          />
        )}

        {activeTab === 'content' && (
          <ContentTab
            pages={pages}
            onPagesChange={handlePagesChange}
            tenantSlug={tenant?.slug}
          />
        )}

        {activeTab === 'branding' && (
          <BrandingTab
            logoMediaId={logoMediaId}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            accentColor={accentColor}
            typography={typography}
            onLogoChange={handleLogoChange}
            onColorsChange={handleColorsChange}
            onTypographyChange={handleTypographyChange}
            tenantSlug={tenant?.slug}
          />
        )}

        {activeTab === 'header-footer' && (
          <HeaderFooterTab
            headerConfig={headerConfig}
            footerConfig={footerConfig}
            onHeaderChange={handleHeaderChange}
            onFooterChange={handleFooterChange}
            tenantSlug={tenant?.slug}
          />
        )}
      </div>
    </div>
  )
}
