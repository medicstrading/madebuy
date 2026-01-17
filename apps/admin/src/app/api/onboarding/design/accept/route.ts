import { tenants } from '@madebuy/db'
import type {
  HeaderConfig,
  NavLink,
  WebsitePage,
  WebsiteTemplate,
} from '@madebuy/shared'
import { getDefaultPages } from '@madebuy/shared'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * Maps scanner template recommendations to actual WebsiteTemplate types
 */
function mapToWebsiteTemplate(recommended: string): WebsiteTemplate {
  const templateMap: Record<string, WebsiteTemplate> = {
    'e-commerce': 'classic-store',
    portfolio: 'portfolio',
    'landing-page': 'landing-page',
    'blog-magazine': 'magazine',
    // Fallback direct mappings
    'classic-store': 'classic-store',
    magazine: 'magazine',
  }
  return templateMap[recommended] || 'classic-store'
}

/**
 * POST /api/onboarding/design/accept
 * Accepts the extracted design and applies it to the tenant
 */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant
    const tenant = await tenants.getTenantById(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check if there's a design to accept
    const designImport = tenant.domainOnboarding?.designImport
    if (!designImport?.extractedDesign) {
      return NextResponse.json(
        { error: 'No design to accept. Please scan a website first.' },
        { status: 400 },
      )
    }

    const extracted = designImport.extractedDesign

    // Determine template from recommendation
    const template: WebsiteTemplate = extracted.templateMatch?.recommended
      ? mapToWebsiteTemplate(extracted.templateMatch.recommended)
      : 'classic-store'

    // Get default pages for the template
    const defaultPages: WebsitePage[] = getDefaultPages(template)

    // Build header config from extracted navigation
    const headerConfig: HeaderConfig = {
      style: 'default',
      showLogo: true,
      showBusinessName: !extracted.logo?.downloadedMediaId, // Hide name if logo exists
      showCart: true,
      sticky: true,
      // Convert extracted nav items to NavLinks
      navLinks: extracted.navigation?.items
        .slice(0, 6)
        .map((item: { label: string; href: string }, index: number) => ({
          id: `nav-${index}`,
          label: item.label,
          url: item.href.startsWith('/') ? item.href : `/${item.href}`,
          openInNewTab: false,
        })) as NavLink[] | undefined,
    }

    // Build update object
    const updates: Record<string, unknown> = {
      // Update branding colors if extracted
      ...(extracted.colors.primary && {
        primaryColor: extracted.colors.primary,
      }),
      ...(extracted.colors.accent && { accentColor: extracted.colors.accent }),

      // Update logo if downloaded
      ...(extracted.logo?.downloadedMediaId && {
        logoMediaId: extracted.logo.downloadedMediaId,
      }),

      // Update website design with full configuration
      websiteDesign: {
        ...tenant.websiteDesign,
        template,
        pages: defaultPages,
        header: headerConfig,
        typography: extracted.typography.matchedPreset || 'modern',
        footer: {
          style: 'standard',
          showLogo: true,
          showSocialLinks: true,
          showPoweredBy: true,
        },
      },

      // Mark design import as accepted
      domainOnboarding: {
        ...tenant.domainOnboarding,
        designImport: {
          ...designImport,
          importStatus: 'accepted',
        },
      },

      // Complete onboarding
      onboardingStep: 'complete',
      onboardingComplete: true,
    }

    await tenants.updateTenant(user.id, updates)

    return NextResponse.json({
      success: true,
      message: 'Design applied successfully',
      appliedTemplate: template,
      appliedColors: {
        primary: extracted.colors.primary,
        accent: extracted.colors.accent,
      },
      appliedTypography: extracted.typography.matchedPreset,
      appliedLogo: !!extracted.logo?.downloadedMediaId,
      appliedNavItems: extracted.navigation?.items.length || 0,
      appliedSections: extracted.sections?.length || 0,
    })
  } catch (error) {
    console.error('Accept design error:', error)
    return NextResponse.json(
      { error: 'Failed to apply design' },
      { status: 500 },
    )
  }
}
