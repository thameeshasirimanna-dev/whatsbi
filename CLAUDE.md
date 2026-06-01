# CLAUDE.md — WhatsBi Project Rules

## 1. Read Before You Work

**Always read these docs before starting any task:**

- [PRODUCT_STRUCTURE.md](PRODUCT_STRUCTURE.md) — architecture, stack, modules, DB schema
- [README.md](README.md) — setup and entry points
- [edge-functions-classification.md](edge-functions-classification.md) — edge/backend split
- [supabase-rest-scan-report.md](supabase-rest-scan-report.md) — API surface and auth patterns

For any task touching a module: read the relevant source files **before** writing a single line.

---

## 2. Skill & Plugin Usage — Mandatory

Use the correct skill/plugin for every task. Do not do manually what a skill handles.

| Task type | Use |
|---|---|
| UI component / page / layout | `frontend-design` or `ui-ux-pro-max` skill |
| Full UI flow (multi-screen) | `design-flow` skill |
| Design system / tokens | `design-system` or `design-export` skill |
| Design QA / accessibility | `design-qa` skill |
| SEO audit | `seo-audit` skill |
| SEO page analysis | `seo-page` skill |
| SEO technical | `seo-technical` skill |
| Code review | `code-review` skill |
| Security audit | `security-review` skill |
| Simplification/cleanup | `simplify` skill |
| Claude API / Anthropic SDK work | `claude-api` skill |
| Run/verify app behavior | `run` or `verify` skill |
| Settings / hooks / permissions | `update-config` skill |
| Keybindings | `keybindings-help` skill |
| Scheduled/recurring tasks | `schedule` skill |
| Repeated polling tasks | `loop` skill |

**Subagent delegation rules (use CaveCrew to save context):**
- Locate code / find symbols → `cavecrew-investigator`
- 1–2 file edits (mechanical) → `cavecrew-builder`
- Diff / PR review → `cavecrew-reviewer`

---

## 3. Stack Constraints

- **Backend:** Fastify 5 + TypeScript ESM. No CommonJS `require()`.
- **Frontend:** React 18 + Vite + Tailwind. No class components.
- **DB:** PostgreSQL 15 via `pg`. No ORM. Raw parameterized queries only.
- **Auth:** JWT (`jsonwebtoken`). Tokens in `Authorization: Bearer` header.
- **Storage:** Cloudflare R2 via `@aws-sdk/client-s3`.
- **Real-time:** Socket.IO v4 only.
- **Multi-tenant:** Every query must scope by `tenant_id`. Never leak cross-tenant data.

---

## 4. Code Rules

- No comments unless WHY is non-obvious.
- No ORM, no mocks in DB tests, no feature flags.
- Validate only at system boundaries (user input, WhatsApp webhook, external APIs).
- No backwards-compat hacks. Delete dead code.
- Security: parameterize all SQL, sanitize all webhook payloads, never log tokens/secrets.

---

## 5. Before Committing

1. Run type check: `npm run type-check` (frontend and backend)
2. No `console.log` left in production paths
3. No `.env` values hardcoded
4. Tenant isolation verified for any DB query added/changed

---

## 6. Project Context

**WhatsBi** — multi-tenant WhatsApp Business CRM.
Stack: React 18 / Fastify 5 / PostgreSQL 15 / Redis / Cloudflare R2 / Docker Compose.
WhatsApp Cloud API v23.0 (Meta Graph API).
