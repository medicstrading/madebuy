# Feature Discovery: madebuy

You are analyzing this project to identify features, improvements, and opportunities.
Your goal is to provide **specific, actionable suggestions** categorized by type and prioritized by impact.

## Project Overview

- **Name:** madebuy
- **Path:** /home/aaron/claude-project/madebuy
- **Tech Stack:** python, node
- **Frameworks:** react, docker
- **Has Tests:** No
- **Has CI:** Yes
- **Has Docker:** Yes

## Project Structure

**Directories:** apps, data, output, prompts, docs, node_modules, scripts, ui-previews, packages

**Entry Points:** None found

## Dependencies

**Node:** bcryptjs, mongodb, nanoid, sharp, @types/node, eslint, typescript


## Current Findings

These are issues and patterns detected in the codebase:

### TODOs and FIXMEs


**TODO** (1 found):

- `apps/admin/src/lib/services/invoice-ocr.ts:87`: Implement PDF to image conversion


### Files Without Tests

- ecosystem.dev.config.js

- ecosystem.config.js

- .nexus/index.js

- .nexus/router.js

- scripts/remove-test-data.ts

- scripts/seed-marketplace-demo.ts

- scripts/seed-full-marketplace.ts

- scripts/migrate-pieces-to-products.ts

- scripts/seed-more-items.ts

- scripts/create-test-tenant.ts

- ... and 10 more


---

## Your Task

Based on the project analysis and findings above, provide feature and improvement suggestions.

**IMPORTANT:** Organize your suggestions by IMPACT LEVEL first, then by CATEGORY within each level.

### Output Format

```
## High Impact

### Security
- **[Suggestion Title]**: Brief description of what to implement and why it matters.
  - Files: file1.py, file2.py
  - Evidence: Why this was identified

### Performance
- **[Suggestion Title]**: ...

## Medium Impact

### UI/UX
- ...

### API
- ...

## Low Impact

### Documentation
- ...

### Developer Experience
- ...
```

### Categories to Consider

- 🔒 **Security**: auth, password, token, encrypt, decrypt...

- ⚡ **Performance**: cache, optimize, index, query, slow...

- 🎨 **UI/UX**: button, form, modal, loading, toast...

- 🔌 **API**: endpoint, route, request, response, api...

- 🧪 **Testing**: test, coverage, mock, fixture, assertion...

- 📚 **Documentation**: readme, docs, comment, docstring, jsdoc...

- 🛠️ **Developer Experience**: lint, format, hook, ci, workflow...

- 🏗️ **Infrastructure**: docker, deploy, kubernetes, terraform, aws...

- 💾 **Data & Storage**: database, model, schema, migration, orm...

- ✨ **Features**: feature, functionality, add, new, implement...


### Impact Levels

- **High Impact**: Security vulnerabilities, missing core functionality, blockers, things that could cause data loss or security issues
- **Medium Impact**: Performance improvements, UX enhancements, code quality, things that would improve daily usage
- **Low Impact**: Documentation, nice-to-haves, minor improvements, polish

### Guidelines

1. Be SPECIFIC - reference actual files, functions, patterns you see in the findings
2. Prioritize SECURITY issues as high impact
3. Consider the tech stack when suggesting solutions
4. Don't suggest things that are already done (check the findings)
5. For each suggestion, briefly explain WHY it matters
