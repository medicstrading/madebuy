'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Instagram, Facebook, ShoppingBag, User, Heart } from 'lucide-react'
import type { Tenant, HeaderConfig, WebsitePage } from '@madebuy/shared'
import { useCart } from '@/contexts/CartContext'

interface HeaderProps {
  tenant: Tenant
  tenantSlug: string
  headerConfig?: HeaderConfig
  logoUrl?: string // Resolved from logoMediaId by parent
  pages?: WebsitePage[] // Navigation pages from multi-page system
}

interface SimpleNavLink {
  url: string
  label: string
}

function getNavLinksFromPages(tenantSlug: string, pages: WebsitePage[]): SimpleNavLink[] {
  return pages
    .filter(p => p.type !== 'home') // Don't show home in navigation
    .map(page => ({
      url: `/${tenantSlug}${page.slug ? `/${page.slug}` : ''}`,
      label: page.navigationLabel || page.title,
    }))
}

function getDefaultNavLinks(tenantSlug: string, tenant: Tenant): SimpleNavLink[] {
  const links: SimpleNavLink[] = [
    { url: `/${tenantSlug}/shop`, label: 'Shop' },
  ]

  // Add Collections if tenant has them
  links.push({ url: `/${tenantSlug}/collections`, label: 'Collections' })

  // Add Blog if enabled
  if (tenant.websiteDesign?.blog?.enabled) {
    links.push({ url: `/${tenantSlug}/blog`, label: 'Blog' })
  }

  // Add About and Contact
  links.push({ url: `/${tenantSlug}/about`, label: 'About' })
  links.push({ url: `/${tenantSlug}/contact`, label: 'Contact' })

  return links
}

export function Header({ tenant, tenantSlug, headerConfig, logoUrl, pages }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()

  const primaryColor = tenant.primaryColor || '#1a1a1a'
  const accentColor = tenant.accentColor || '#f59e0b'
  const businessName = tenant.businessName

  // Determine navigation links: pages > custom config > defaults
  // 1. If pages provided from multi-page system, use those
  // 2. Else if custom nav links in header config, use those
  // 3. Otherwise generate defaults
  let navLinks: SimpleNavLink[]
  if (pages && pages.length > 0) {
    navLinks = getNavLinksFromPages(tenantSlug, pages)
  } else if (headerConfig?.navLinks?.length) {
    navLinks = headerConfig.navLinks.map(link => ({
      url: link.url,
      label: link.label,
    }))
  } else {
    navLinks = getDefaultNavLinks(tenantSlug, tenant)
  }

  // Header style from config
  const style = headerConfig?.style || 'default'
  const isTransparent = style === 'transparent'
  const isMinimal = style === 'minimal'

  const socialLinks = {
    instagram: tenant.instagram ? `https://instagram.com/${tenant.instagram}` : undefined,
    facebook: tenant.facebook ? `https://facebook.com/${tenant.facebook}` : undefined,
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b ${
        isTransparent
          ? 'border-white/10 bg-black/20 backdrop-blur-md'
          : 'border-gray-100 bg-white'
      }`}
      style={!isTransparent ? { backgroundColor: headerConfig?.backgroundColor } : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 md:h-16 lg:h-20 items-center justify-between">
          {/* Mobile menu trigger */}
          <button
            className={`lg:hidden p-1 ${isTransparent ? 'text-white' : 'text-gray-700'}`}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo and business name */}
          <div className="flex-1 lg:flex-none">
            <Link href={`/${tenantSlug}`} className="flex items-center gap-2 lg:gap-3">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${businessName} Logo`}
                  width={50}
                  height={50}
                  className="object-contain w-8 h-8 md:w-10 md:h-10 lg:w-[50px] lg:h-[50px]"
                />
              ) : (
                <div
                  className="w-8 h-8 md:w-10 md:h-10 lg:w-[50px] lg:h-[50px] rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {businessName.charAt(0)}
                </div>
              )}
              {!isMinimal && (
                <h1
                  className={`hidden sm:block text-lg md:text-xl lg:text-2xl font-serif ${
                    isTransparent ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {businessName}
                </h1>
              )}
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-8 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                className={`text-base transition-colors ${
                  isTransparent
                    ? 'text-white hover:text-white/80'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={{ '--hover-color': accentColor } as React.CSSProperties}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: wishlist + cart + social */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Wishlist */}
            <Link
              href={`/${tenantSlug}/wishlist`}
              className={`p-2 rounded-lg transition-colors ${
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="View wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Shopping Cart */}
            <Link
              href={`/${tenantSlug}/cart`}
              className={`relative p-2 rounded-lg transition-colors ${
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={`Shopping cart, ${totalItems} items`}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-white text-xs font-bold rounded-full"
                  style={{ backgroundColor: accentColor }}
                >
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Social links - desktop only */}
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Instagram page"
                className={`hidden lg:flex p-2 rounded-lg transition-colors ${
                  isTransparent
                    ? 'text-white hover:bg-white/10'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {socialLinks.facebook && (
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Facebook page"
                className={`hidden lg:flex p-2 rounded-lg transition-colors ${
                  isTransparent
                    ? 'text-white hover:bg-white/10'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Facebook className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-white shadow-xl"
            style={{ backgroundColor: headerConfig?.backgroundColor || 'white' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="text-xl font-serif text-gray-900">{businessName}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-gray-500"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.url}
                  href={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors px-4 py-3 rounded-md"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Social links in mobile drawer */}
            {(socialLinks.instagram || socialLinks.facebook) && (
              <div className="mt-auto p-4 border-t border-gray-100">
                <p className="text-gray-500 text-sm mb-3">Follow us</p>
                <div className="flex gap-3">
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Visit our Instagram page"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Instagram className="w-6 h-6" />
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Visit our Facebook page"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Facebook className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
