'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Share2,
  Package,
  FileText,
  Check,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Calendar,
  PenTool,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  ShoppingBag,
  Image,
  Video,
  Cloud,
  Zap,
  ArrowRight,
  Play,
} from 'lucide-react'

// Platform icons as SVG components for better quality
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
)

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.2.6 2.18 1.78 2.18 2.14 0 3.78-2.26 3.78-5.51 0-2.88-2.07-4.9-5.03-4.9-3.42 0-5.44 2.57-5.44 5.22 0 1.03.4 2.14.9 2.74.1.12.11.22.08.34l-.34 1.36c-.05.22-.18.27-.4.16-1.5-.7-2.43-2.88-2.43-4.64 0-3.77 2.74-7.24 7.9-7.24 4.15 0 7.37 2.96 7.37 6.92 0 4.12-2.6 7.44-6.2 7.44-1.21 0-2.35-.63-2.74-1.37l-.75 2.84c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1012 0z"/>
  </svg>
)

const EtsyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M8.56 4.22c0-.86.01-1.08.63-1.24l1.08-.27V2H3.65v.71l.95.18c.63.13.74.4.79 1.24.05.84.05 1.5.05 4.87v5.78c0 1.7-.06 3.03-.11 3.7-.07.63-.25.87-.84 1.03l-.95.23v.71h8.04c.6 0 1.13-.02 1.67-.08l.77-4.56-.77-.13c-.5 1.87-1.2 3.43-3.53 3.43-1.67 0-2.12-.76-2.12-2.76V12.7h2.16c1.6 0 1.92.55 2.05 2.12h.73V9.54h-.73c-.13 1.57-.5 2.12-2.05 2.12H7.55V5.58c0-1.36.5-1.36 1.01-1.36z"/>
  </svg>
)

const EbayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M5.87 8.25c-2.66 0-4.67 1.08-4.67 3.54 0 1.7 1.16 2.69 2.93 2.69 1.44 0 2.46-.67 3.02-1.41h.04c0 .39.03.76.09 1.11h2.32a8.91 8.91 0 01-.13-1.58V9.78c0-1.7-1.21-2.94-3.86-2.94-2.18 0-3.67.94-3.93 2.52l2.31.35c.13-.69.64-1.16 1.58-1.16.97 0 1.46.43 1.46 1.07v.29l-2.08.29c-1.73.24-3.41.85-3.41 2.63 0 1.48 1.16 2.39 2.98 2.39 1.3 0 2.33-.52 2.89-1.34h.04c.02.41.07.81.15 1.21h2.45a10.4 10.4 0 01-.18-2.03v-3.2c0-2.1-1.48-3.61-4.0-3.61zm.52 5.92c-.82 0-1.26-.36-1.26-.93 0-.72.64-.99 1.5-1.11l1.79-.25v.52c0 1.06-.89 1.77-2.03 1.77zm7.41-5.79v5.86c0 .48-.03.98-.1 1.44h2.35c.07-.36.1-.76.1-1.18h.04c.41.82 1.31 1.37 2.48 1.37 2.14 0 3.52-1.72 3.52-4.09 0-2.31-1.31-4.0-3.41-4.0-1.21 0-2.19.55-2.66 1.42h-.04V5.41L13.8 5v3.38zm4.14 5.73c-1.18 0-1.84-.97-1.84-2.31 0-1.34.66-2.29 1.84-2.29 1.2 0 1.84.95 1.84 2.29 0 1.34-.64 2.31-1.84 2.31z"/>
  </svg>
)

export default function LandingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-[#FFFBF7] font-outfit overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFBF7]/90 backdrop-blur-md border-b border-amber-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">MadeBuy</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-amber-700 transition-colors font-medium">Features</a>
              <a href="#integrations" className="text-gray-600 hover:text-amber-700 transition-colors font-medium">Integrations</a>
              <a href="#pricing" className="text-gray-600 hover:text-amber-700 transition-colors font-medium">Pricing</a>
              <Link href="/auth/signin" className="text-gray-600 hover:text-amber-700 transition-colors font-medium">Sign In</Link>
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-full font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20">
        {/* Organic background shapes */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-amber-100/60 via-orange-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-violet-50/50 via-purple-50/30 to-transparent rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Tagline badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              <span>One platform. Everything you need.</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
              From workshop to world{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">— simplified.</span>
                <svg className="absolute -bottom-1 left-0 w-full h-3 text-amber-300/60" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,8 Q40,2 80,8 T160,6 T200,8" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Inventory, media storage, social scheduling, and marketplace selling — all in one place. You didn&apos;t start making things to juggle 10 different apps.
            </p>

            {/* Platform logos row */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <span className="text-sm text-gray-500 mr-2">Connects to:</span>
              {[
                { icon: Instagram, label: 'Instagram', color: 'hover:text-pink-500' },
                { icon: Facebook, label: 'Facebook', color: 'hover:text-blue-600' },
                { icon: TikTokIcon, label: 'TikTok', color: 'hover:text-gray-900' },
                { icon: Youtube, label: 'YouTube', color: 'hover:text-red-500' },
                { icon: PinterestIcon, label: 'Pinterest', color: 'hover:text-red-600' },
                { icon: Twitter, label: 'Twitter', color: 'hover:text-sky-500' },
                { icon: EtsyIcon, label: 'Etsy', color: 'hover:text-orange-500' },
                { icon: EbayIcon, label: 'eBay', color: 'hover:text-blue-500' },
              ].map((platform) => (
                <div
                  key={platform.label}
                  className={`w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 ${platform.color} transition-colors cursor-default shadow-sm`}
                  title={platform.label}
                >
                  <platform.icon />
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/auth/signup"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 hover:-translate-y-1"
              >
                Start Free Today
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border-2 border-gray-200 hover:border-amber-300 hover:text-amber-700 transition-all shadow-sm"
              >
                See How It Works
              </a>
            </div>

            {/* Dashboard preview */}
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl shadow-gray-300/40 border border-gray-200/60 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 bg-gray-100 h-7 rounded-lg max-w-xs mx-auto flex items-center justify-center">
                    <span className="text-xs text-gray-400">app.madebuy.com.au</span>
                  </div>
                </div>

                <div className="p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-white">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Revenue', value: '$4,280', trend: '+12%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Material Costs', value: '$1,420', trend: null, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Actual Profit', value: '$2,860', trend: '+18%', color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Profit Margin', value: '67%', trend: '+5%', color: 'text-teal-600', bg: 'bg-teal-50' },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                        <p className="text-xs text-gray-500 mb-1 font-medium">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                          <p className={`text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                          {stat.trend && (
                            <span className="text-xs text-emerald-600 font-medium">{stat.trend}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Two-column layout */}
                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Product list */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm">Products</h3>
                        <span className="text-xs text-gray-400">12 items</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'Ceramic Mug', profit: '$37' },
                          { name: 'Wall Hanging', profit: '$96' },
                        ].map((product) => (
                          <div key={product.name} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                            </div>
                            <p className="font-bold text-emerald-600 text-sm">{product.profit}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Social schedule */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm">Scheduled Posts</h3>
                        <span className="text-xs text-emerald-600 font-medium">5 this week</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { platform: 'Instagram', time: 'Today 6pm', icon: Instagram, color: 'bg-pink-50 text-pink-500' },
                          { platform: 'TikTok', time: 'Tomorrow 2pm', icon: TikTokIcon, color: 'bg-gray-100 text-gray-700' },
                        ].map((post) => (
                          <div key={post.platform} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className={`w-8 h-8 rounded-lg ${post.color} flex items-center justify-center`}>
                              <post.icon />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{post.platform}</p>
                              <p className="text-xs text-gray-500">{post.time}</p>
                            </div>
                            <Sparkles className="w-4 h-4 text-violet-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 lg:-right-8 bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-4 border border-gray-100 animate-float hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">AI Caption Ready</p>
                    <p className="text-xs text-gray-500">Posted to 3 platforms</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 lg:-left-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-xl shadow-emerald-500/30 p-4 animate-float-delayed hidden sm:block">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6" />
                  <div>
                    <p className="font-bold text-lg">+23%</p>
                    <p className="text-xs opacity-90">Profit this week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All-in-One Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Stop switching between{' '}
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">10 different apps</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              One login. Everything connected. Your photos, videos, products, and social posts — all in sync.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Media Storage */}
            <div className="relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-8 border border-violet-100 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-200/30 to-transparent rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Cloud className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Media Library</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Store all your product photos and videos in one place. Organize, tag, and reuse across listings and social posts.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-violet-700">
                    <Image className="w-4 h-4" />
                    <span>Photos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-violet-700">
                    <Video className="w-4 h-4" />
                    <span>Videos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-violet-700">
                    <Cloud className="w-4 h-4" />
                    <span>Up to 10GB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Publishing */}
            <div className="relative bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-8 border border-pink-100 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-200/30 to-transparent rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Social Manager</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Schedule posts to all platforms. AI writes captions in your voice. A week of content in 10 minutes.
                </p>
                <div className="flex items-center gap-2">
                  {[Instagram, Facebook, TikTokIcon, Youtube, PinterestIcon, Twitter].map((Icon, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-white/80 border border-pink-100 flex items-center justify-center text-gray-500">
                      <Icon />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Marketplace Selling */}
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100 overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Sell Everywhere</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Sync products directly to Etsy & eBay. Manage inventory from one dashboard. Never oversell again.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg border border-blue-100">
                    <EtsyIcon />
                    <span className="text-sm font-medium text-gray-700">Etsy</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-lg border border-blue-100">
                    <EbayIcon />
                    <span className="text-sm font-medium text-gray-700">eBay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Deep Dive Section */}
      <section id="integrations" className="py-20 lg:py-28 bg-gradient-to-b from-gray-900 to-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/10">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>AI-Powered Social Management</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                One post.{' '}
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Six platforms.</span>{' '}
                Zero stress.
              </h2>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Upload your product photos and videos once. Our AI writes captions that sound like you. Schedule posts across Instagram, TikTok, Facebook, YouTube, Pinterest, and Twitter — all from one screen.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { title: 'AI captions in your voice', desc: 'Learns your style. Never sounds robotic.' },
                  { title: 'Optimal posting times', desc: 'AI picks when your audience is most active.' },
                  { title: 'Video & photo support', desc: 'Reels, Stories, TikToks, Pins — we handle it all.' },
                  { title: 'A week of content in minutes', desc: 'Batch create. Schedule. Forget about it.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/auth/signup"
                className="group inline-flex items-center gap-2 text-violet-400 font-semibold hover:text-violet-300 transition-colors"
              >
                Start scheduling for free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-gray-800/50 rounded-3xl p-6 lg:p-8 border border-gray-700/50 backdrop-blur-sm">
                {/* Platform grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: Instagram, name: 'Instagram', color: 'from-pink-500 to-purple-600', posts: '12 posts' },
                    { icon: TikTokIcon, name: 'TikTok', color: 'from-gray-700 to-gray-900', posts: '8 videos' },
                    { icon: Facebook, name: 'Facebook', color: 'from-blue-500 to-blue-700', posts: '10 posts' },
                    { icon: Youtube, name: 'YouTube', color: 'from-red-500 to-red-700', posts: '4 videos' },
                    { icon: PinterestIcon, name: 'Pinterest', color: 'from-red-500 to-red-600', posts: '15 pins' },
                    { icon: Twitter, name: 'Twitter', color: 'from-sky-400 to-sky-600', posts: '20 posts' },
                  ].map((platform) => (
                    <div
                      key={platform.name}
                      className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors group cursor-default"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center mb-3 text-white group-hover:scale-110 transition-transform`}>
                        <platform.icon />
                      </div>
                      <p className="font-semibold text-white text-sm">{platform.name}</p>
                      <p className="text-gray-500 text-xs">{platform.posts}</p>
                    </div>
                  ))}
                </div>

                {/* AI caption preview */}
                <div className="bg-gradient-to-br from-violet-900/50 to-purple-900/50 rounded-2xl p-5 border border-violet-700/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">AI Caption Generator</p>
                      <p className="text-violet-300 text-xs">Writes in your voice</p>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-violet-800/30">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      &ldquo;New drop alert! 🎨 This hand-thrown ceramic mug took 3 weeks to perfect. Every swirl is unique — just like you. Link in bio to grab yours before they&apos;re gone!&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
                      <span className="text-xs text-violet-400">#handmade #ceramics #smallbusiness</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-2xl p-4 shadow-xl shadow-emerald-500/30 animate-float">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Posted!</p>
                    <p className="text-xs opacity-90">6 platforms at once</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Integration Section */}
      <section className="py-20 lg:py-28 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
                {/* Sync status */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900">Marketplace Sync</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">All synced</span>
                </div>

                {/* Marketplace cards */}
                <div className="space-y-4">
                  {[
                    { name: 'Etsy', icon: EtsyIcon, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-600', listings: 24, orders: 8 },
                    { name: 'eBay', icon: EbayIcon, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600', listings: 18, orders: 5 },
                  ].map((marketplace) => (
                    <div key={marketplace.name} className={`${marketplace.color} rounded-2xl p-5 border`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${marketplace.textColor}`}>
                            <marketplace.icon />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{marketplace.name}</p>
                            <p className="text-xs text-gray-500">Connected</p>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-2xl font-bold text-gray-900">{marketplace.listings}</p>
                          <p className="text-xs text-gray-500">Active listings</p>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3">
                          <p className="text-2xl font-bold text-emerald-600">{marketplace.orders}</p>
                          <p className="text-xs text-gray-500">Orders this week</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inventory sync indicator */}
                <div className="mt-6 bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Inventory auto-synced</p>
                    <p className="text-sm text-gray-500">Stock levels updated across all platforms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <ShoppingBag className="w-4 h-4" />
                <span>Marketplace Integration</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
                Sell on Etsy & eBay.{' '}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Manage from here.</span>
              </h2>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Connect your marketplace accounts and manage everything from one dashboard. Create a listing once — push it everywhere. Update stock in one place — it syncs automatically.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Sync products to Etsy & eBay instantly',
                  'Unified inventory across all platforms',
                  'Centralized order management',
                  'Never oversell — stock updates in real-time',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-gray-700 font-medium">{item}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/auth/signup"
                className="group inline-flex items-center gap-2 text-amber-600 font-semibold hover:text-amber-700 transition-colors"
              >
                Connect your stores
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Plus everything else you need to{' '}
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">run your business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Not a generic e-commerce tool. Designed around how handmade businesses actually work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Know Your Real Profits */}
            <div className="group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 lg:p-10 border border-emerald-100 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Know Your Real Profits</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Track materials, costs, and margins per product. See what you&apos;re actually making — not just what you&apos;re selling.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Cost tracking', 'Margin analysis', 'Per-product profit'].map((tag) => (
                      <span key={tag} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Materials & Supply Tracking */}
            <div className="group bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 lg:p-10 border border-amber-100 hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Materials & Supply Tracking</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Track inventory, costs per unit, supplier info. Get reorder alerts before you run out.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Inventory alerts', 'Cost per unit', 'Supplier tracking'].map((tag) => (
                      <span key={tag} className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Australian Tax Ready */}
            <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 lg:p-10 border border-blue-100 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Australian Tax Ready</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    GST/BAS compliance built in. Auto-generated statements. Hand your accountant a clean PDF, not a shoebox.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['GST tracking', 'BAS reports', 'Export to PDF'].map((tag) => (
                      <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Built for Makers */}
            <div className="group bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-8 lg:p-10 border border-rose-100 hover:shadow-xl hover:shadow-rose-100/50 transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform">
                  <PenTool className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Built for Makers</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Not a generic e-commerce tool. Designed around how handmade businesses actually work — from one-of-a-kind pieces to custom orders.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Custom orders', 'Variations', 'OOAK tracking'].map((tag) => (
                      <span key={tag} className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="py-16 bg-gradient-to-r from-amber-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Join hundreds of makers who&apos;ve taken control
              </h3>
              <p className="text-amber-100 text-lg">
                Stop juggling apps. Start growing your handmade business.
              </p>
            </div>
            <Link
              href="/auth/signup"
              className="group inline-flex items-center justify-center gap-2 bg-white text-amber-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-amber-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Start Free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28 bg-[#FFFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Start free. Upgrade when you&apos;re ready. No hidden fees.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 bg-white rounded-full p-1.5 shadow-sm border border-gray-100">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  !isYearly ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  isYearly ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                Yearly <span className={`text-sm ml-1 ${isYearly ? 'text-amber-100' : 'text-emerald-600'}`}>Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: 'Starter',
                price: { monthly: 0, yearly: 0 },
                description: 'Try it out',
                features: [
                  '5 products',
                  '50 MB storage',
                  'Basic profit tracking',
                  'Email support',
                ],
                cta: 'Start Free',
                popular: false,
              },
              {
                name: 'Maker',
                price: { monthly: 15, yearly: 150 },
                description: 'For growing makers',
                features: [
                  '50 products',
                  '500 MB storage',
                  '2 social platforms',
                  '20 AI captions/month',
                  'Etsy sync',
                  'GST reports',
                ],
                cta: 'Get Started',
                popular: true,
              },
              {
                name: 'Professional',
                price: { monthly: 29, yearly: 290 },
                description: 'Full-time makers',
                features: [
                  '200 products',
                  '2 GB storage',
                  'All social platforms',
                  '100 AI captions/month',
                  'Etsy + eBay sync',
                  'Priority support',
                ],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Studio',
                price: { monthly: 59, yearly: 590 },
                description: 'Established brands',
                features: [
                  'Unlimited products',
                  '10 GB storage',
                  'Unlimited AI captions',
                  'All marketplace sync',
                  'API access',
                  '3 team members',
                ],
                cta: 'Get Started',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-6 lg:p-8 transition-all ${
                  plan.popular
                    ? 'border-2 border-amber-400 shadow-xl shadow-amber-100/50 scale-105 lg:scale-110 z-10'
                    : 'border-2 border-gray-100 hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${isYearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly}
                    </span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  {isYearly && plan.price.yearly > 0 && (
                    <p className="text-sm text-emerald-600 mt-1">
                      ${plan.price.yearly}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/signup"
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Calendar className="w-4 h-4" />
            <span>14-day free trial, no card required</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Ready to run your business from{' '}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">one place?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Products, social media, marketplaces, and real profit numbers — all connected. Finally.
          </p>
          <Link
            href="/auth/signup"
            className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-10 py-5 rounded-full font-semibold text-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 hover:-translate-y-1"
          >
            Start Free Today
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-white">MadeBuy</span>
              </Link>
              <p className="text-sm leading-relaxed mb-4">
                The all-in-one platform for makers. Inventory, social media, marketplaces — connected.
              </p>
              <div className="flex items-center gap-3">
                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-3">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/seller-stories" className="hover:text-white transition-colors">Seller Stories</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} MadeBuy. Made with love in Australia.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Integrates with:</span>
              {[EtsyIcon, EbayIcon].map((Icon, i) => (
                <div key={i} className="text-gray-500">
                  <Icon />
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 5s ease-in-out infinite 2.5s;
        }
      `}</style>
    </div>
  )
}
