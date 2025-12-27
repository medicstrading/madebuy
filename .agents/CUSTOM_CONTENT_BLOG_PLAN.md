# Custom Content & Blog Implementation Plan
**Project Manager Review - December 27, 2025**

## Executive Summary

**Completed So Far:**
- ✅ Phase 1: Foundation & Colors (TenantTheme, CSS variables, color pickers)
- ✅ Phase 2: Banner & Typography (Hero banners, font selection)
- ✅ Phase 3: Layout Templates (4 layouts: grid/minimal/featured/masonry)
- ✅ Logo Upload with R2 storage integration

**Remaining Work:**
- ❌ Phase 4: Live Preview (split-screen editor)
- ❌ Phase 5: Custom Sections (7 section types)
- ❌ Phase 6: Blog System (TipTap editor, blog management)
- ❌ Phase 7: Polish & Optimization
- ❌ **NEW**: Blog-Publish Integration (blog as publish destination)

---

## NEW REQUIREMENT: Blog-Publish Integration

### User Story
"When a tenant enables blog in Website Design settings, the blog should appear as a publishing destination in the Publish interface alongside social media platforms (Instagram, Facebook, etc.). Users can then publish content to their blog at the same time as posting to social media."

### Architecture Design

#### 1. Publishing Destinations Model
```typescript
// packages/shared/src/types/publish.ts

export type PublishDestination =
  | 'instagram'
  | 'facebook'
  | 'pinterest'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'threads'
  | 'bluesky'
  | 'mastodon'
  | 'website-blog'  // NEW: Internal blog

export interface BlogPublishConfig {
  title: string
  excerpt?: string
  content: string  // Rich text HTML
  coverImageId?: string
  tags: string[]
  status: 'draft' | 'published'
  publishAt?: Date  // Schedule for later
}
```

#### 2. Publish Flow Integration

**Current Publish Flow:**
1. User creates post in `/dashboard/publish`
2. Selects social media platforms
3. Customizes content per platform
4. Clicks "Publish Now" or "Schedule"
5. Late.dev API handles social media publishing

**New Flow with Blog:**
1. User creates post in `/dashboard/publish`
2. Selects destinations (social + blog)
3. If blog selected:
   - Shows blog-specific fields (title, excerpt, SEO)
   - Uses same media as social posts
   - Allows rich text content editing
4. On publish:
   - Late.dev handles social media
   - Internal API creates blog post
   - Blog post inherits content/media from social post

#### 3. UI Changes Required

**File: `/apps/admin/src/app/(dashboard)/dashboard/publish/page.tsx`**

Add blog as destination option:
```typescript
// Check if tenant has blog enabled
const blogEnabled = tenant.websiteDesign?.blog?.enabled || false

// Show blog in platform selector
{blogEnabled && (
  <PlatformCard
    platform="website-blog"
    label="Website Blog"
    icon={<FileText />}
    selected={selectedPlatforms.includes('website-blog')}
    onToggle={handleToggle}
  />
)}

// Show blog-specific fields when selected
{selectedPlatforms.includes('website-blog') && (
  <BlogPostFields
    title={blogTitle}
    excerpt={blogExcerpt}
    tags={blogTags}
    onTitleChange={setBlogTitle}
    onExcerptChange={setBlogExcerpt}
    onTagsChange={setBlogTags}
  />
)}
```

#### 4. API Integration

**New Route: `/apps/admin/src/app/api/publish/route.ts`**

Handle multi-destination publishing:
```typescript
export async function POST(request: NextRequest) {
  const { destinations, content, media, blogConfig } = await request.json()

  const results = {
    social: null,
    blog: null,
  }

  // Publish to social media via Late.dev
  if (destinations.some(d => d !== 'website-blog')) {
    results.social = await publishToSocial({ destinations, content, media })
  }

  // Publish to internal blog
  if (destinations.includes('website-blog')) {
    results.blog = await blog.createBlogPost(tenantId, {
      title: blogConfig.title,
      excerpt: blogConfig.excerpt,
      content: blogConfig.content,
      coverImageId: media[0]?.id,
      tags: blogConfig.tags,
      status: blogConfig.status,
      publishedAt: blogConfig.status === 'published' ? new Date() : undefined,
    })
  }

  return NextResponse.json(results)
}
```

---

## Phase 5: Custom Sections (PRIORITY)

### Implementation Steps

**Week 1: Schema & Core Infrastructure**

1. **Create Section Types** (`packages/shared/src/types/sections.ts`)
```typescript
export type SectionType =
  | 'hero'           // Large image + headline + CTA
  | 'features'       // 3-column icon grid
  | 'testimonials'   // Customer reviews carousel
  | 'cta'            // Call-to-action banner
  | 'gallery'        // Image grid
  | 'text-image'     // Side-by-side content
  | 'faq'            // Accordion Q&A

export interface CustomSection {
  id: string
  type: SectionType
  order: number
  enabled: boolean
  config: SectionConfig
}

export type SectionConfig =
  | HeroSectionConfig
  | FeaturesSectionConfig
  | TestimonialsSectionConfig
  | CTASectionConfig
  | GallerySectionConfig
  | TextImageSectionConfig
  | FAQSectionConfig

export interface HeroSectionConfig {
  mediaId?: string
  headline: string
  subheadline?: string
  ctaText?: string
  ctaUrl?: string
  alignment: 'left' | 'center' | 'right'
}

// ... define other config types
```

2. **Update Tenant Schema**
```typescript
// Add to Tenant.websiteDesign
sections?: CustomSection[]
```

3. **Create Database Migration**
```typescript
// Add sections array to existing tenants
db.tenants.updateMany(
  { 'websiteDesign': { $exists: true } },
  { $set: { 'websiteDesign.sections': [] } }
)
```

**Week 2: Admin UI Components**

4. **Section Builder** (`apps/admin/src/components/website-design/SectionBuilder.tsx`)
- Drag-to-reorder with @dnd-kit
- Add section dropdown
- Enable/disable toggles
- Delete sections

5. **Section Editors** (7 components)
- HeroSectionEditor
- FeaturesSectionEditor
- TestimonialsSectionEditor
- CTASectionEditor
- GallerySectionEditor
- TextImageSectionEditor
- FAQSectionEditor

**Week 3: Storefront Rendering**

6. **Section Renderers** (`apps/web/src/components/storefront/sections/`)
- Create 7 matching components
- Responsive design
- Theme-aware (use CSS variables)

7. **Integrate into Homepage**
```typescript
// apps/web/src/app/[tenant]/page.tsx

{/* Custom Sections */}
{tenant.websiteDesign?.sections
  ?.filter(s => s.enabled)
  ?.sort((a, b) => a.order - b.order)
  ?.map(section => (
    <DynamicSection key={section.id} section={section} />
  ))
}
```

### Dependencies to Install
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Phase 6: Blog System (PRIORITY)

### Implementation Steps

**Week 1: Database & Types**

1. **Blog Post Schema** (`packages/shared/src/types/blog.ts`)
```typescript
export interface BlogPost {
  id: string
  tenantId: string
  slug: string
  title: string
  excerpt?: string
  content: string  // Rich text HTML from TipTap
  coverImageId?: string
  metaTitle?: string
  metaDescription?: string
  status: 'draft' | 'published'
  publishedAt?: Date
  tags: string[]
  views: number
  author?: string
  createdAt: Date
  updatedAt: Date
}
```

2. **Blog Repository** (`packages/db/src/repositories/blog.ts`)
```typescript
export const blog = {
  async listBlogPosts(tenantId: string, options?: {
    status?: 'draft' | 'published'
    limit?: number
    offset?: number
  }): Promise<BlogPost[]>

  async getBlogPost(tenantId: string, id: string): Promise<BlogPost | null>

  async getBlogPostBySlug(tenantId: string, slug: string): Promise<BlogPost | null>

  async createBlogPost(tenantId: string, data: Partial<BlogPost>): Promise<BlogPost>

  async updateBlogPost(tenantId: string, id: string, data: Partial<BlogPost>): Promise<BlogPost>

  async deleteBlogPost(tenantId: string, id: string): Promise<void>

  async publishBlogPost(tenantId: string, id: string): Promise<BlogPost>
}
```

3. **MongoDB Indexes**
```typescript
db.blog_posts.createIndex({ tenantId: 1, status: 1, publishedAt: -1 })
db.blog_posts.createIndex({ tenantId: 1, slug: 1 }, { unique: true })
db.blog_posts.createIndex({ tags: 1 })
```

**Week 2: Admin UI - Blog Management**

4. **Blog List Page** (`apps/admin/src/app/(dashboard)/dashboard/blog/page.tsx`)
- Table view with filters (all/draft/published)
- Search by title
- Create new post button
- Edit/delete actions
- View count stats

5. **Blog Editor** (`apps/admin/src/app/(dashboard)/dashboard/blog/[id]/page.tsx`)
- TipTap rich text editor
- Cover image upload
- SEO fields (meta title, description)
- Tags input
- Slug auto-generation
- Save draft / Publish buttons

6. **TipTap Setup**
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder
```

**Week 3: Storefront Blog Pages**

7. **Blog Index** (`apps/web/src/app/[tenant]/blog/page.tsx`)
- Grid of blog posts (pagination)
- Filter by tags
- Search functionality
- SEO meta tags

8. **Blog Post Page** (`apps/web/src/app/[tenant]/blog/[slug]/page.tsx`)
- Render rich text content
- Display cover image
- Show publish date, author
- Related posts
- Share buttons
- View counter increment

9. **Blog Toggle in Website Design**
Enable/disable blog feature in website design settings.

**Week 4: Blog-Publish Integration**

10. **Add Blog to Publish Interface**
- Show blog as destination when enabled
- Blog-specific fields (title, excerpt, tags)
- Reuse media from social posts
- Handle simultaneous publish to social + blog

---

## Updated API Routes

```
# Blog (Admin)
GET    /api/blog                   # List blog posts (with filters)
POST   /api/blog                   # Create blog post
GET    /api/blog/[id]              # Get blog post by ID
PATCH  /api/blog/[id]              # Update blog post
DELETE /api/blog/[id]              # Delete blog post
POST   /api/blog/[id]/publish      # Publish draft post

# Blog (Public - Storefront)
GET    /[tenant]/blog              # Blog index page
GET    /[tenant]/blog/[slug]       # Individual blog post
POST   /[tenant]/blog/[slug]/view  # Increment view counter

# Publishing (Enhanced)
POST   /api/publish                # Publish to multiple destinations (social + blog)
```

---

## Dependencies Summary

```bash
# Custom Sections
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Blog Editor
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder

# URL Slugs
pnpm add slugify

# Already installed
# - react-colorful (for color pickers)
# - next-image (for image optimization)
```

---

## Implementation Priority Order

### Priority 1: Blog System (3 weeks)
**Why:** User specifically requested blog-publish integration. Blog is a Business+ feature that drives revenue.

**Tasks:**
1. Week 1: Database schema, repository, MongoDB indexes
2. Week 2: Admin UI (blog list, editor with TipTap)
3. Week 3: Storefront pages, SEO optimization
4. Week 4: Blog-publish integration

**Success Criteria:**
- Business tenants can create/edit/publish blog posts
- Blog appears on storefront with proper SEO
- Blog shows as publish destination when enabled
- Can publish to blog + social simultaneously

### Priority 2: Custom Sections (3 weeks)
**Why:** Enables unique storefront designs. Business+ feature.

**Tasks:**
1. Week 1: Schema, types, database migration
2. Week 2: Admin UI (section builder, 7 editors)
3. Week 3: Storefront rendering, responsive design

**Success Criteria:**
- Business tenants can add/reorder 7 section types
- Sections render correctly on storefront
- Drag-drop reordering works smoothly

### Priority 3: Live Preview (1 week)
**Why:** Enhances UX but not critical for functionality

**Tasks:**
1. Split-screen layout
2. Iframe preview with device toggle
3. PostMessage communication
4. Debounced auto-save

### Priority 4: Polish & Optimization (1 week)
**Why:** Quality of life improvements

**Tasks:**
1. Loading states
2. Error handling
3. Performance optimization
4. Help tooltips

---

## Risk Assessment

### Low Risk ✅
- Blog database schema (standard CRUD)
- TipTap integration (well-documented)
- Blog-publish integration (simple API call)

### Medium Risk ⚠️
- Drag-drop section reordering (UI complexity)
- Rich text content sanitization (XSS prevention)
- SEO optimization (requires testing)

### High Risk ⚠️⚠️
- Live preview iframe (PostMessage reliability)
- Blog slug uniqueness enforcement
- Content migration if schema changes

---

## Next Steps

1. **Approve this plan** - Confirm priorities and timeline
2. **Install dependencies** - Add npm packages
3. **Start with Blog System** - Begin Phase 6 implementation
4. **Test incrementally** - Deploy each feature to staging
5. **Plan gating** - Ensure Business+ features are properly restricted

---

## Success Metrics

- **Blog Adoption:** 30% of Business tenants enable blog within 30 days
- **Content Publishing:** 50% of blog-enabled tenants publish to blog + social simultaneously
- **Custom Sections:** Average 3 custom sections per Business tenant storefront
- **Performance:** Blog pages load in < 2s (Lighthouse 90+)
- **SEO:** Blog posts indexed by Google within 48 hours

---

**Estimated Total Time:** 8 weeks
**Team Required:** 1-2 developers
**Budget:** Low (leverages existing infrastructure)
