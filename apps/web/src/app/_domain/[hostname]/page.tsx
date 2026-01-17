import { notFound, redirect } from 'next/navigation'
import { getTenantByActiveDomain } from '@/lib/tenant'

interface DomainPageProps {
  params: Promise<{
    hostname: string
  }>
}

/**
 * Custom Domain Landing Page
 * Looks up tenant by custom domain and redirects to their storefront
 */
export default async function DomainPage({ params }: DomainPageProps) {
  const { hostname } = await params

  // Decode the hostname (it may be URL-encoded)
  const decodedHostname = decodeURIComponent(hostname)

  // Look up the tenant by custom domain (cached)
  const tenant = await getTenantByActiveDomain(decodedHostname)

  if (!tenant) {
    // Domain not found or not verified
    notFound()
  }

  // Redirect to the tenant's storefront
  // This will use the slug-based routing
  redirect(`/${tenant.slug}`)
}

export async function generateMetadata({ params }: DomainPageProps) {
  const { hostname } = await params
  const decodedHostname = decodeURIComponent(hostname)
  const tenant = await getTenantByActiveDomain(decodedHostname)

  if (!tenant) {
    return { title: 'Not Found' }
  }

  return {
    title: tenant.businessName,
    description:
      tenant.tagline || tenant.description || `Shop ${tenant.businessName}`,
  }
}
