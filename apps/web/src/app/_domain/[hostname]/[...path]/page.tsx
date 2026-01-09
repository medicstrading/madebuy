import { notFound, redirect } from 'next/navigation'
import { getTenantByActiveDomain } from '@/lib/tenant'

interface DomainPathPageProps {
  params: Promise<{
    hostname: string
    path: string[]
  }>
}

/**
 * Custom Domain Path Handler
 * Looks up tenant by custom domain and redirects to their storefront subpath
 */
export default async function DomainPathPage({ params }: DomainPathPageProps) {
  const { hostname, path } = await params

  // Decode the hostname
  const decodedHostname = decodeURIComponent(hostname)

  // Look up the tenant by custom domain (cached)
  const tenant = await getTenantByActiveDomain(decodedHostname)

  if (!tenant) {
    notFound()
  }

  // Reconstruct the path
  const subPath = path.join('/')

  // Redirect to the tenant's storefront with the path
  redirect(`/${tenant.slug}/${subPath}`)
}

export async function generateMetadata({ params }: DomainPathPageProps) {
  const { hostname } = await params
  const decodedHostname = decodeURIComponent(hostname)
  const tenant = await getTenantByActiveDomain(decodedHostname)

  if (!tenant) {
    return { title: 'Not Found' }
  }

  return {
    title: tenant.businessName,
    description: tenant.tagline || tenant.description || `Shop ${tenant.businessName}`,
  }
}
