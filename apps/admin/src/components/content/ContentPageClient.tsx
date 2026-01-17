'use client'

import type {
  BlogPost,
  Newsletter,
  NewsletterStats,
  PublishRecord,
} from '@madebuy/shared'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Instagram,
  Newspaper,
  Plus,
  Send,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type TabId = 'social' | 'blog' | 'newsletters'

interface TabConfig {
  id: TabId
  label: string
  icon: typeof Share2
  description: string
  gradient: string
  iconBg: string
  activeBorder: string
}

const tabs: TabConfig[] = [
  {
    id: 'social',
    label: 'Social Publishing',
    icon: Share2,
    description: 'Post to Instagram, Facebook & more',
    gradient: 'from-pink-500 via-rose-500 to-orange-400',
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
    activeBorder: 'border-rose-400',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: FileText,
    description: 'Articles & stories',
    gradient: 'from-blue-500 to-cyan-400',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    activeBorder: 'border-blue-400',
  },
  {
    id: 'newsletters',
    label: 'Newsletters',
    icon: Newspaper,
    description: 'Email campaigns',
    gradient: 'from-violet-500 to-purple-400',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-500',
    activeBorder: 'border-violet-400',
  },
]

interface ContentPageClientProps {
  publishRecords: PublishRecord[]
  publishStats: {
    total: number
    published: number
    scheduled: number
    draft: number
  }
  hasSocialConnections: boolean
  blogPosts: BlogPost[]
  blogStats: {
    total: number
    published: number
    drafts: number
    totalViews: number
  }
}

export function ContentPageClient({
  publishRecords,
  publishStats,
  hasSocialConnections,
  blogPosts,
  blogStats,
}: ContentPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('social')
  const _activeConfig = tabs.find((t) => t.id === activeTab)!

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          // Badge counts
          let badgeCount = 0
          let badgeLabel = ''
          if (tab.id === 'social') {
            badgeCount = publishStats.scheduled
            badgeLabel = 'scheduled'
          }
          if (tab.id === 'blog') {
            badgeCount = blogStats.drafts
            badgeLabel = 'drafts'
          }

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative group text-left p-5 rounded-2xl border-2 transition-all duration-200
                ${
                  isActive
                    ? `bg-white ${tab.activeBorder} shadow-lg shadow-gray-200/50 scale-[1.02]`
                    : 'bg-white/60 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${tab.gradient} opacity-5`}
                />
              )}

              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                  transition-transform duration-200 group-hover:scale-110
                  ${isActive ? tab.iconBg : 'bg-gray-100'}
                `}
                >
                  <Icon
                    className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-500'}`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}
                    >
                      {tab.label}
                    </h3>
                    {badgeCount > 0 && (
                      <span
                        className={`
                        px-2 py-0.5 text-xs font-medium rounded-full
                        ${
                          isActive
                            ? `bg-gradient-to-r ${tab.gradient} text-white`
                            : 'bg-gray-100 text-gray-600'
                        }
                      `}
                      >
                        {badgeCount} {badgeLabel}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${isActive ? 'text-gray-600' : 'text-gray-500'}`}
                  >
                    {tab.description}
                  </p>
                </div>

                {/* Active arrow */}
                {isActive && (
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                )}
              </div>

              {/* Bottom gradient bar for active */}
              {isActive && (
                <div
                  className={`absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r ${tab.gradient}`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === 'social' && (
          <SocialTab
            records={publishRecords}
            stats={publishStats}
            hasSocialConnections={hasSocialConnections}
          />
        )}
        {activeTab === 'blog' && (
          <BlogTab posts={blogPosts} stats={blogStats} />
        )}
        {activeTab === 'newsletters' && <NewslettersTab />}
      </div>
    </div>
  )
}

// =============================================================================
// SOCIAL TAB - Hero Treatment
// =============================================================================

function SocialTab({
  records,
  stats,
  hasSocialConnections,
}: {
  records: PublishRecord[]
  stats: { total: number; published: number; scheduled: number; draft: number }
  hasSocialConnections: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Hero CTA - Always Prominent */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-8 text-white">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        {/* Floating icons */}
        <div className="absolute top-6 right-6 opacity-20">
          <Instagram className="h-24 w-24" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium text-white/90 uppercase tracking-wider">
              Social Publishing
            </span>
          </div>

          <h2 className="text-3xl font-bold mb-2">
            Share your creations with the world
          </h2>
          <p className="text-white/80 mb-6 max-w-xl">
            Create beautiful posts, schedule them for the perfect time, and
            reach your audience across Instagram, Facebook, and more.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/publish/new"
              className="inline-flex items-center gap-2 bg-white text-rose-600 px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-black/20"
            >
              <Zap className="h-5 w-5" />
              Create New Post
            </Link>

            {!hasSocialConnections && (
              <Link
                href="/dashboard/connections"
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white px-5 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors border border-white/30"
              >
                <ExternalLink className="h-4 w-4" />
                Connect Accounts
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SocialStatCard
          title="Total Posts"
          value={stats.total}
          icon={TrendingUp}
          color="slate"
        />
        <SocialStatCard
          title="Published"
          value={stats.published}
          icon={CheckCircle}
          color="green"
          highlight
        />
        <SocialStatCard
          title="Scheduled"
          value={stats.scheduled}
          icon={Calendar}
          color="blue"
        />
        <SocialStatCard
          title="Drafts"
          value={stats.draft}
          icon={Edit}
          color="amber"
        />
      </div>

      {/* Posts Table */}
      {records.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-4">
            <Share2 className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No posts yet</h3>
          <p className="mt-2 text-gray-600 max-w-sm mx-auto">
            Create your first social media post to share your work with your
            followers.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Recent Posts</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Caption
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2 max-w-md font-medium">
                      {record.caption}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {record.mediaIds.length} media &middot;{' '}
                      {record.hashtags.length} hashtags
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex gap-1.5">
                      {record.platforms.map((platform) => (
                        <PlatformIcon key={platform} platform={platform} />
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <PublishStatusBadge status={record.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.scheduledFor ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {formatDate(record.scheduledFor)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SocialStatCard({
  title,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  title: string
  value: number
  icon: any
  color: 'slate' | 'green' | 'blue' | 'amber'
  highlight?: boolean
}) {
  const colors = {
    slate: {
      bg: 'bg-slate-50',
      icon: 'text-slate-500',
      border: 'border-slate-200',
    },
    green: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-200',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-200',
    },
  }

  const c = colors[color]

  return (
    <div
      className={`
      rounded-xl p-4 border transition-all duration-200
      ${highlight ? `${c.bg} ${c.border} shadow-sm` : 'bg-white border-gray-200'}
    `}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.icon}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// BLOG TAB
// =============================================================================

function BlogTab({
  posts,
  stats,
}: {
  posts: BlogPost[]
  stats: {
    total: number
    published: number
    drafts: number
    totalViews: number
  }
}) {
  return (
    <div className="space-y-6">
      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blog Posts</h2>
          <p className="text-gray-500 text-sm">
            Create and manage your blog content
          </p>
        </div>
        <Link
          href="/dashboard/blog/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md shadow-blue-500/20"
        >
          <Edit className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BlogStatCard title="Total Posts" value={stats.total} icon={FileText} />
        <BlogStatCard
          title="Published"
          value={stats.published}
          icon={CheckCircle}
          accent
        />
        <BlogStatCard title="Drafts" value={stats.drafts} icon={Clock} />
        <BlogStatCard title="Total Views" value={stats.totalViews} icon={Eye} />
      </div>

      {/* Posts Table */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            No blog posts yet
          </h3>
          <p className="mt-2 text-gray-600 max-w-sm mx-auto">
            Create your first blog post to share stories, tips, or showcase your
            work.
          </p>
          <Link
            href="/dashboard/blog/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {post.title}
                      </div>
                      {post.excerpt && (
                        <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                          {post.excerpt}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <BlogStatusBadge status={post.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Eye className="h-4 w-4 text-gray-400" />
                      {post.views.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 2 && (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          +{post.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(post.publishedAt || post.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/blog/${post.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BlogStatCard({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string
  value: number
  icon: any
  accent?: boolean
}) {
  return (
    <div
      className={`
      rounded-xl p-4 border transition-all
      ${accent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
    `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-lg p-2 ${accent ? 'bg-blue-100' : 'bg-gray-100'}`}
        >
          <Icon
            className={`h-5 w-5 ${accent ? 'text-blue-600' : 'text-gray-500'}`}
          />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// NEWSLETTERS TAB
// =============================================================================

function NewslettersTab() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [stats, setStats] = useState<NewsletterStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetchNewsletters()
    fetchStats()
  }, [fetchNewsletters, fetchStats])

  async function fetchNewsletters() {
    try {
      const res = await fetch('/api/newsletters')
      const data = await res.json()
      setNewsletters(data.items || [])
    } catch (error) {
      console.error('Failed to fetch newsletters:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/newsletters/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function sendNewsletter(id: string) {
    if (
      !confirm(
        'Are you sure you want to send this newsletter? This action cannot be undone.',
      )
    )
      return

    setSending(id)
    try {
      const res = await fetch(`/api/newsletters/${id}/send`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      alert(`Newsletter sent to ${data.sentCount} subscribers!`)
      fetchNewsletters()
      fetchStats()
    } catch (error: any) {
      alert(error.message || 'Failed to send newsletter')
    } finally {
      setSending(null)
    }
  }

  async function deleteNewsletter(id: string) {
    if (!confirm('Are you sure you want to delete this newsletter?')) return

    try {
      await fetch(`/api/newsletters/${id}`, { method: 'DELETE' })
      fetchNewsletters()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete newsletter:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Newsletters</h2>
          <p className="text-gray-500 text-sm">
            Create and send email campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/newsletters/template"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Template
          </Link>
          <Link
            href="/dashboard/newsletters/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-all shadow-md shadow-violet-500/20"
          >
            <Plus className="h-4 w-4" />
            New Newsletter
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NewsletterStatCard title="Total" value={stats.total} />
          <NewsletterStatCard
            title="Drafts"
            value={stats.drafts}
            color="amber"
          />
          <NewsletterStatCard title="Sent" value={stats.sent} color="green" />
          <div className="rounded-xl bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Last Sent</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {stats.lastSentAt ? formatDate(stats.lastSentAt) : 'Never'}
            </p>
          </div>
        </div>
      )}

      {/* Newsletter List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {newsletters.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No newsletters yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first newsletter to engage with your subscribers.
            </p>
            <Link
              href="/dashboard/newsletters/new"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Newsletter
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {newsletters.map((newsletter) => (
              <div
                key={newsletter.id}
                className="p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {newsletter.subject || 'Untitled Newsletter'}
                      </h3>
                      {newsletter.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Sent
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      <span>Created {formatDate(newsletter.createdAt)}</span>
                      {newsletter.sentAt && (
                        <span className="flex items-center gap-1">
                          <Send className="h-3.5 w-3.5" />
                          {newsletter.recipientCount} recipients
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {newsletter.status === 'draft' && (
                      <>
                        <Link
                          href={`/dashboard/newsletters/${newsletter.id}`}
                          className="p-2.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => sendNewsletter(newsletter.id)}
                          disabled={sending === newsletter.id}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          title="Send"
                        >
                          <Send className="h-4 w-4" />
                          {sending === newsletter.id ? 'Sending...' : 'Send'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNewsletter(newsletter.id)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NewsletterStatCard({
  title,
  value,
  color,
}: {
  title: string
  value: number
  color?: 'amber' | 'green'
}) {
  const valueColor =
    color === 'amber'
      ? 'text-amber-600'
      : color === 'green'
        ? 'text-emerald-600'
        : 'text-gray-900'

  return (
    <div className="rounded-xl bg-white p-4 border border-gray-200">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  )
}

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

function PublishStatusBadge({ status }: { status: string }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    publishing: 'bg-purple-100 text-purple-700',
    published: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status as keyof typeof styles] || styles.draft}`}
    >
      {status === 'published' && <CheckCircle className="h-3.5 w-3.5" />}
      {status === 'scheduled' && <Calendar className="h-3.5 w-3.5" />}
      {status}
    </span>
  )
}

function BlogStatusBadge({ status }: { status: 'draft' | 'published' }) {
  const styles = {
    draft: 'bg-amber-100 text-amber-700',
    published: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status === 'published' && <CheckCircle className="h-3.5 w-3.5" />}
      {status}
    </span>
  )
}

function PlatformIcon({ platform }: { platform: string }) {
  const styles = {
    instagram:
      'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white',
    facebook: 'bg-blue-600 text-white',
    tiktok: 'bg-gray-900 text-white',
    pinterest: 'bg-red-600 text-white',
    youtube: 'bg-red-600 text-white',
  }

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shadow-sm ${styles[platform as keyof typeof styles] || 'bg-gray-200 text-gray-600'}`}
    >
      {platform[0].toUpperCase()}
    </span>
  )
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
