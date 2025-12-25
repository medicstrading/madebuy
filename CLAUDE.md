# MadeBuy Project - Claude Configuration

## Available Agents

Use these specialized agents by saying "Act as [agent-name] and [task]"

### Build & Code Quality
- `code-fixer` - Auto-fix TypeScript, lint, build errors
- `deployment-reviewer` - Pre-deploy checks, Vercel compatibility

### Version Control
- `git-workflow` - Commits, PRs, releases, versioning

### Architecture Reviews
- `database-reviewer` - MongoDB, schemas, indexes
- `backend-context-reviewer` - APIs, services
- `frontend-context-reviewer` - React, components
- `security-context-reviewer` - Auth, permissions

### Quality Assurance
- `testing-reviewer` - Test coverage
- `performance-reviewer` - Lighthouse, bundle size
- `ui-reviewer` - Screenshots, design improvements

### Infrastructure
- `devops-reviewer` - Docker, CI/CD

## Project Context

MadeBuy is a multi-tenant e-commerce platform for handmade jewelry businesses.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Storage**: Cloudflare R2
- **Auth**: NextAuth.js
- **Deployment**: Vercel
- **Monorepo**: pnpm workspaces

### Package Structure
- `apps/admin` - Admin dashboard
- `apps/web` - Customer-facing storefront
- `packages/shared` - Shared types and utilities
- `packages/db` - Database client and repositories
- `packages/storage` - Cloudflare R2 integration
- `packages/social` - Late.dev social media integration
- `packages/marketplaces` - Etsy/Shopify marketplace integrations

### Active Integrations
- **Late.dev** - Multi-platform social media publishing (11 platforms)
- **Etsy** - Marketplace integration with OAuth, listing sync, webhooks
- **PayPal** - Payment processing (via MCP)
- **Vercel** - Hosting and deployment (via MCP)

### Development Notes
- TypeScript strict mode (with some exceptions)
- MongoDB uses namespace exports (e.g., `pieces.listPieces()` not `piecesRepository.list()`)
- All packages must be added to `transpilePackages` in Next.js config
- Use `pnpm build` to build all packages
- Environment variables in `.env.local` files

### Recent Work
- Completed Etsy marketplace integration (OAuth, sync, webhooks)
- Added integration types to tenant and piece schemas
- Created comprehensive API routes for Etsy operations

## GitHub Integration

**Connected Account:** medicstrading
**Repository:** https://github.com/medicstrading/madebuy
**Token Scopes:** repo, read:packages, read:org

This project has GitHub MCP enabled. You can use commands like:
- Create issues and PRs
- Review pull requests
- Check commit history
- Manage repository settings
