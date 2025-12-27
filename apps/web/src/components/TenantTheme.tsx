import type { Tenant } from '@madebuy/shared/src/types/tenant'
import { getTypographyConfig, getGoogleFontsUrl, getDefaultWebsiteDesign } from '@madebuy/shared/src/constants/typography'

interface TenantThemeProps {
  tenant: Tenant
  children: React.ReactNode
}

export function TenantTheme({ tenant, children }: TenantThemeProps) {
  const design = tenant.websiteDesign || getDefaultWebsiteDesign()
  const typography = getTypographyConfig(design.typography)
  const googleFontsUrl = getGoogleFontsUrl(design.typography)

  return (
    <>
      {/* Load Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* Inject CSS Variables */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --color-primary: ${tenant.primaryColor};
              --color-accent: ${tenant.accentColor};
              --font-heading: ${typography.heading.fontFamily};
              --font-body: ${typography.body.fontFamily};
            }
          `,
        }}
      />

      {children}
    </>
  )
}
