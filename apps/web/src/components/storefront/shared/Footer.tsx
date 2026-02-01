import type { FooterConfig, Tenant, WebsitePage } from '@madebuy/shared'
import { Facebook, Instagram, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'

interface FooterProps {
  tenant: Tenant
  tenantSlug: string
  footerConfig?: FooterConfig
  pages?: WebsitePage[] // Navigation pages from multi-page system
}

export function Footer({
  tenant,
  tenantSlug,
  footerConfig,
  pages,
}: FooterProps) {
  const primaryColor = tenant.primaryColor || '#1a1a1a'
  const businessName = tenant.businessName
  const tagline = tenant.tagline || tenant.description
  const location = tenant.location
  const email = tenant.email
  const hasBlog = tenant.websiteDesign?.blog?.enabled

  // Get page links from pages if available
  const pageLinks =
    pages
      ?.filter((p) => p.type !== 'home')
      .map((p) => ({
        url: `/${tenantSlug}${p.slug ? `/${p.slug}` : ''}`,
        label: p.navigationLabel || p.title,
      })) || []

  const socialLinks = {
    instagram: tenant.instagram
      ? `https://instagram.com/${tenant.instagram}`
      : undefined,
    facebook: tenant.facebook
      ? `https://facebook.com/${tenant.facebook}`
      : undefined,
    tiktok: tenant.tiktok ? `https://tiktok.com/@${tenant.tiktok}` : undefined,
  }

  const hasSocialLinks =
    socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok

  // Footer style
  const style = footerConfig?.style || 'default'
  const isMinimal = style === 'minimal'
  const showPaymentMethods = footerConfig?.showPaymentMethods ?? true
  const showSocialLinks = footerConfig?.showSocialLinks ?? true

  return (
    <footer
      className="text-white"
      style={{ backgroundColor: footerConfig?.backgroundColor || primaryColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {!isMinimal && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand column */}
            <div>
              <h3 className="text-xl font-serif mb-4">{businessName}</h3>
              {tagline && (
                <p className="text-sm opacity-80 leading-relaxed">{tagline}</p>
              )}
              {location && (
                <p className="text-sm opacity-60 mt-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {location}
                </p>
              )}
            </div>

            {/* Explore column */}
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-white/80">
                {pageLinks.length > 0 ? (
                  // Use pages from multi-page system
                  pageLinks.map((link) => (
                    <li key={link.url}>
                      <Link
                        href={link.url}
                        className="hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))
                ) : (
                  // Fallback to default links
                  <>
                    <li>
                      <Link
                        href={`/${tenantSlug}`}
                        className="hover:text-white transition-colors"
                      >
                        Shop
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={`/${tenantSlug}/collections`}
                        className="hover:text-white transition-colors"
                      >
                        Collections
                      </Link>
                    </li>
                    {hasBlog && (
                      <li>
                        <Link
                          href={`/${tenantSlug}/blog`}
                          className="hover:text-white transition-colors"
                        >
                          Blog
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        href={`/${tenantSlug}/about`}
                        className="hover:text-white transition-colors"
                      >
                        About
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Connect column */}
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-white/80">
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email Us
                    </a>
                  </li>
                )}
                <li>
                  <Link
                    href={`/${tenantSlug}/contact`}
                    className="hover:text-white transition-colors"
                  >
                    Contact Form
                  </Link>
                </li>
              </ul>
            </div>

            {/* Follow Us column */}
            {showSocialLinks && hasSocialLinks && (
              <div>
                <h4 className="font-semibold mb-4">Follow Us</h4>
                <ul className="space-y-2 text-sm text-white/80">
                  {socialLinks.instagram && (
                    <li>
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                    </li>
                  )}
                  {socialLinks.facebook && (
                    <li>
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors flex items-center gap-2"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </a>
                    </li>
                  )}
                  {socialLinks.tiktok && (
                    <li>
                      <a
                        href={socialLinks.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        TikTok
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Information Links Row */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-white/80 pb-8">
          <Link
            href={`/${tenantSlug}/contact`}
            className="hover:text-white transition-colors"
          >
            Contact
          </Link>
          <Link
            href={`/${tenantSlug}/faq`}
            className="hover:text-white transition-colors"
          >
            FAQ
          </Link>
          <Link
            href={`/${tenantSlug}/shipping`}
            className="hover:text-white transition-colors"
          >
            Shipping
          </Link>
          <Link
            href={`/${tenantSlug}/returns`}
            className="hover:text-white transition-colors"
          >
            Returns
          </Link>
          <Link
            href={`/${tenantSlug}/terms`}
            className="hover:text-white transition-colors"
          >
            Terms
          </Link>
          <Link
            href={`/${tenantSlug}/privacy`}
            className="hover:text-white transition-colors"
          >
            Privacy
          </Link>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-80">
            &copy; {new Date().getFullYear()} {businessName}. All rights
            reserved.
          </p>

          {/* Payment Methods */}
          {showPaymentMethods && (
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-80">We accept:</span>
              <div className="flex items-center gap-2">
                {/* Visa */}
                <div className="bg-white rounded px-2 py-1">
                  <svg
                    className="h-5 w-8"
                    viewBox="0 0 50 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.5 1.5L16.5 14.5H13L16 1.5H19.5Z"
                      fill="#1A1F71"
                    />
                    <path
                      d="M32 1.5L28.5 10L28 7.5L26.5 2.5C26.5 2.5 26.3 1.5 25 1.5H19.5L19.4 1.8C19.4 1.8 21 2.2 22.8 3.3L26 14.5H29.5L35.5 1.5H32Z"
                      fill="#1A1F71"
                    />
                    <path
                      d="M37 14.5H40.3L37.5 1.5H34.5C33.5 1.5 33.2 2.3 33.2 2.3L28 14.5H31.5L32.2 12.5H36.5L37 14.5ZM33.2 10L35 5L36 10H33.2Z"
                      fill="#1A1F71"
                    />
                    <path
                      d="M12 1.5L8.5 10.5L8 7.5C7.3 5 5 2.5 2.5 1.5L5.5 14.5H9L15.5 1.5H12Z"
                      fill="#1A1F71"
                    />
                    <path
                      d="M6.5 1.5H1L1 1.8C4.5 2.7 7 5 8 7.5L7 2.5C6.8 1.8 6.2 1.5 5.5 1.5H6.5Z"
                      fill="#F9A51A"
                    />
                  </svg>
                </div>
                {/* Mastercard */}
                <div className="bg-white rounded px-2 py-1">
                  <svg
                    className="h-5 w-8"
                    viewBox="0 0 50 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="18" cy="15" r="12" fill="#EB001B" />
                    <circle cx="32" cy="15" r="12" fill="#F79E1B" />
                    <path
                      d="M25 5.5C27.5 7.5 29 10.5 29 15C29 19.5 27.5 22.5 25 24.5C22.5 22.5 21 19.5 21 15C21 10.5 22.5 7.5 25 5.5Z"
                      fill="#FF5F00"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Powered by */}
          <p className="text-sm opacity-60">
            Powered by{' '}
            <a
              href="https://madebuy.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              MadeBuy
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
