import { requireTenant } from '@/lib/session'
import { publish, blog } from '@madebuy/db'
import { ContentPageClient } from '@/components/content/ContentPageClient'

export const metadata = {
  title: 'Content - MadeBuy Admin',
}

export default async function ContentPage() {
  const tenant = await requireTenant()

  // Fetch publish records and blog posts in parallel
  const [publishRecords, blogPosts] = await Promise.all([
    publish.listPublishRecords(tenant.id),
    blog.listBlogPosts(tenant.id),
  ])

  // Compute stats
  const publishStats = {
    total: publishRecords.length,
    published: publishRecords.filter(p => p.status === 'published').length,
    scheduled: publishRecords.filter(p => p.status === 'scheduled').length,
    draft: publishRecords.filter(p => p.status === 'draft').length,
  }

  const blogStats = {
    total: blogPosts.length,
    published: blogPosts.filter(p => p.status === 'published').length,
    drafts: blogPosts.filter(p => p.status === 'draft').length,
    totalViews: blogPosts.reduce((sum, p) => sum + p.views, 0),
  }

  // Check if social accounts are connected
  const hasSocialConnections = tenant.socialConnections && tenant.socialConnections.length > 0

  return (
    <ContentPageClient
      publishRecords={publishRecords}
      publishStats={publishStats}
      hasSocialConnections={hasSocialConnections}
      blogPosts={blogPosts}
      blogStats={blogStats}
    />
  )
}
