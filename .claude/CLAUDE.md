# MadeBuy - Project Instructions

## SESSION STARTUP (MANDATORY)

**On EVERY conversation start, run this first:**

```
mcp__enhanced-memory__start_session
  working_directory: "/home/aaron/claude-project/madebuy"
```

This loads previous session context and relevant memories. If it returns a last_session summary, acknowledge what was accomplished.

## Project Info

- **Name:** MadeBuy (PRIMARY project)
- **Purpose:** Etsy alternative marketplace - Shopify features + Etsy exposure, zero transaction fees
- **Stack:** Next.js 14, TypeScript, MongoDB, Tailwind CSS, Turborepo monorepo
- **Structure:** apps/admin, apps/web, packages/shared
- **Ports:** admin=3300, marketplace=3301
- **Deploy:** Vultr VPS with Docker Compose
- **Git account:** medicstrading

## Save/Exit Protocol

When user says "save", "done", "exit", or "save and exit":

1. Run `mcp__enhanced-memory__end_session` with summary and task lists
2. Say "Saved." (no confirmation prompts)
3. If "exit": run `tmux kill-pane` immediately

## Core Rules

- Direct action over asking - just do tasks when requested
- Check logs before guessing when debugging
- Check environment settings first for issues
- Never suggest installing Sentry
- Security-conscious: always consider auth, validation, rate limiting
- Use git push only when explicitly told "push it"

## Git Push Permission

NEVER push without explicit permission phrase: "push it", "push to github", "git push"

When permitted:
```bash
touch ~/.claude/.git-push-approved && git push
```
