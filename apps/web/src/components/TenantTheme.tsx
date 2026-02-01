import {
  getDefaultWebsiteDesign,
  getGoogleFontsUrl,
  getTypographyConfig,
  type Tenant,
} from '@madebuy/shared'

interface TenantThemeProps {
  tenant: Tenant
  children: React.ReactNode
}

// Helper to convert hex to RGB for Tailwind opacity modifiers
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '59, 130, 246' // fallback blue-500
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

export function TenantTheme({ tenant, children }: TenantThemeProps) {
  const design = tenant.websiteDesign || getDefaultWebsiteDesign()
  const typography = getTypographyConfig(design.typography)
  const googleFontsUrl = getGoogleFontsUrl(design.typography)

  const primaryColor = tenant.primaryColor || '#2563eb'
  const accentColor = tenant.accentColor || '#10b981'

  return (
    <>
      {/* Load Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link href={googleFontsUrl} rel="stylesheet" />

      {/* Inject CSS Variables and Theme Styles */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Theme CSS variables are safely constructed from validated color values */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --color-primary: ${primaryColor};
              --color-primary-rgb: ${hexToRgb(primaryColor)};
              --color-accent: ${accentColor};
              --color-accent-rgb: ${hexToRgb(accentColor)};
              --font-heading: ${typography.heading.fontFamily};
              --font-body: ${typography.body.fontFamily};
            }

            /* Apply tenant fonts to entire storefront */
            .tenant-theme {
              font-family: var(--font-body);
            }
            .tenant-theme h1, .tenant-theme h2, .tenant-theme h3, .tenant-theme h4, .tenant-theme h5, .tenant-theme h6 {
              font-family: var(--font-heading);
            }

            /* Primary color utility classes */
            .tenant-theme .bg-primary { background-color: var(--color-primary) !important; }
            .tenant-theme .bg-primary\\/10 { background-color: rgba(var(--color-primary-rgb), 0.1) !important; }
            .tenant-theme .bg-primary\\/20 { background-color: rgba(var(--color-primary-rgb), 0.2) !important; }
            .tenant-theme .text-primary { color: var(--color-primary) !important; }
            .tenant-theme .border-primary { border-color: var(--color-primary) !important; }
            .tenant-theme .ring-primary { --tw-ring-color: var(--color-primary) !important; }

            /* Accent color utility classes */
            .tenant-theme .bg-accent { background-color: var(--color-accent) !important; }
            .tenant-theme .text-accent { color: var(--color-accent) !important; }
            .tenant-theme .border-accent { border-color: var(--color-accent) !important; }

            /* Override common blue classes with primary color */
            .tenant-theme .bg-blue-600, .tenant-theme .bg-blue-500 { background-color: var(--color-primary) !important; }
            .tenant-theme .hover\\:bg-blue-700:hover, .tenant-theme .hover\\:bg-blue-600:hover { background-color: color-mix(in srgb, var(--color-primary) 85%, black) !important; }
            .tenant-theme .text-blue-600, .tenant-theme .text-blue-500 { color: var(--color-primary) !important; }
            .tenant-theme .hover\\:text-blue-600:hover, .tenant-theme .hover\\:text-blue-700:hover { color: var(--color-primary) !important; }
            .tenant-theme .border-blue-600, .tenant-theme .border-blue-500 { border-color: var(--color-primary) !important; }
            .tenant-theme .ring-blue-500, .tenant-theme .ring-blue-600 { --tw-ring-color: var(--color-primary) !important; }
            .tenant-theme .from-blue-500, .tenant-theme .from-blue-600 { --tw-gradient-from: var(--color-primary) !important; }
            .tenant-theme .to-purple-500, .tenant-theme .to-purple-600 { --tw-gradient-to: var(--color-accent) !important; }

            /* Override green classes with accent color for success states */
            .tenant-theme .bg-green-600, .tenant-theme .bg-green-500, .tenant-theme .bg-emerald-500, .tenant-theme .bg-emerald-600 { background-color: var(--color-accent) !important; }
            .tenant-theme .text-green-600, .tenant-theme .text-green-500, .tenant-theme .text-emerald-600 { color: var(--color-accent) !important; }
          `,
        }}
      />

      {children}
    </>
  )
}
