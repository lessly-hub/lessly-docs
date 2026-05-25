# Agent instructions for docs.lessly.com

This is the customer-facing documentation site for Lessly. Astro 6 + a first-party docs engine (no Fumadocs, no Docusaurus, no Nextra). Deployed to https://docs.lessly.com via Cloudflare Workers (PR preview URLs gated by Cloudflare Access for team-only viewing).

If you are an AI agent (Claude Code, Codex, Cursor, Gemini, Copilot) working in this repo, read this file in full before opening a PR.

The full design and rationale live in [`docs/superpowers/specs/2026-05-21-docs-rewrite-design.md`](./docs/superpowers/specs/2026-05-21-docs-rewrite-design.md).

## The four load-bearing rules

1. **"Extension" is a builder concept. It NEVER appears in customer-facing content.**
   The Lessly platform is presented as one coherent product with feature areas (Deployment, Security). Internal terms like `lessly-deployment-extension` repo name stay in the codebase; they do not appear in `content/`.
2. **"Dev Console" is an internal system. It NEVER appears in customer-facing content.**
3. **No customer CLI exists today.** Lessly is consumed via (a) web sign-up at lessly.com and (b) the Lessly MCP server installed into the customer's AI agent (Claude Desktop, Cursor, VS Code, …). Do not document a CLI. Do not pretend one exists. **`MCP` is NOT banned** — it's the customer's install path and must be discussed plainly.
4. **Page-maturity status NEVER renders on the customer surface.** The `status: alpha | beta | stable` frontmatter field is a hidden editorial mark for writers and reviewers — it is required in the schema so every page declares its lifecycle stage, but it MUST NOT be rendered as a pill, badge, banner, or any other visible indicator on docs.lessly.com. Surfacing "alpha"/"beta" to readers undermines trust in the product (they infer the whole product is half-finished). If a page is genuinely not ready, signal it in prose ("This page is a stub. The full how-to lands in the next docs cycle.") — that pattern is already established. See the comment in `src/components/PageMeta.astro` for the load-bearing intent. If the spec doc disagrees, the spec doc is wrong and should be amended.

The CI lint at `.github/workflows/ci.yml` (`lint` job) enforces rules 1 and 2 by grepping `content/`. A PR with `extension` or `Dev Console` will fail. Rules 3 and 4 are enforced by review.

## Choose a page type before writing

Every page is exactly one of four Diátaxis types. Pick before you start:

| Type | Use for | Frontmatter `diataxis:` value |
|---|---|---|
| Tutorial | First-time success ("Deploy your first site") | `tutorial` |
| How-to | Solving a known problem ("Configure firewall rules") | `how-to` |
| Explanation | Understanding a concept ("How the build system works") | `explanation` |
| Reference | Looking up a fact (framework table, MCP tool catalog) | `reference` |

Templates live in `agents/new-docs-page.md`. The PR template asks for the page type and renders the matching checklist.

## Other rules

- **Language:** English only.
- **Brand:** Use Lessly design tokens. Never hardcode hex colors. See `src/styles/global.css` and the Lessly design system (https://github.com/lessly-hub/team-guidebook).
- **URL convention:** docs URLs are path-based (`/docs/*`). The current subdomain (`docs.lessly.com`) is a temporary host; future migration to `lessly.com/docs/*` preserves all paths. Don't introduce route changes that strip the `/docs/` prefix.
- **Nav depth:** No MDX file more than 3 directories deep under `content/docs/`. Enforced by `scripts/check-nav-depth.mjs`.
- **PR workflow:** Branch → PR → Cloudflare Workers preview URL (Access-gated) → review by area DRI → merge. No direct pushes to main.
- **CI:** Banned-vocab lint, nav-depth check, typecheck (astro check + tsc), vitest unit suite, build (astro + pagefind + OG), link integrity, Playwright E2E + axe a11y, AI surface verification (llms.txt + per-page md/mdx + /mcp/tools.json), Lighthouse CLS budget. All gates must pass.
- **Commit format:** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`). Title in English.

## Verification commands

```bash
pnpm test               # vitest unit tests
pnpm check:links        # internal link integrity (run after pnpm build)
pnpm check:nav-depth    # depth lint for content/docs
pnpm test:e2e           # Playwright happy-path + axe a11y
pnpm verify:ai          # AI surface checks (needs a running preview server)
```

For the full local QA workflow (dev server, browser, all gates), see [`agents/run-local.md`](./agents/run-local.md).

## Pre-merge gates

Run these against the Cloudflare Workers preview URL (or `http://localhost:4321/` for local) before requesting review. Each one catches a different class of regression that the unit suite and `pnpm build` won't.

| Gate | Skill / trigger | What it catches |
|------|-----------------|-----------------|
| **Visual conformance** | `/lessly:design audit <url>` | Hardcoded hex colors, off-token spacing, type-scale violations, contrast failures against brand tokens. |
| **UX rules** | `/lessly:ux audit <url>` | Cognitive load, dead-end pages, missing states (loading / empty / error), CTA clarity, error copy, agent-surface contract. 23 rules, PASS/FAIL per rule. |
| **Runtime errors** | `/lessly:errors audit <url>` | New `$exception` events in PostHog tied to the preview URL. The `lessly:errors` skill is planned; until it ships, query PostHog directly via the [`posthog:instrument-error-tracking`](https://github.com/posthog/skills) runbook (`event = '$exception' AND $current_url CONTAINS '<host>'`). |

The Diátaxis + banned-vocab + brand-tokens checks already live in [`agents/review-docs-pr.md`](./agents/review-docs-pr.md) and the PR template — the table above only adds the *automated* / *skill-driven* audits.

These three gates are surfaced in two places by design:
- [`.github/ISSUE_TEMPLATE.md`](./.github/ISSUE_TEMPLATE.md) lists them in **Definition of Done** — the issue sets the contract for what "done" looks like before work starts.
- [`.github/pull_request_template.md`](./.github/pull_request_template.md) lists them as a receipt — the PR author confirms each gate ran against the preview URL.

The duplication is intentional: the issue says *"this must hold before we close"*; the PR says *"I confirmed it holds."*

## When in doubt

- Page-type questions → `agents/new-docs-page.md`
- PR review checklist → `agents/review-docs-pr.md`
- Brand tokens / typography → https://github.com/lessly-hub/team-guidebook (Lessly design system)
- Bigger product / scoping questions → https://github.com/lessly-hub/lessly

## What this repo is NOT

- Not the marketing landing page (that's `lessly-landing`).
- Not the API reference for service-to-service calls (those live with each service).
- Not the builder rulebook for extension authors (that's `extensions-guide`).
- Not the team SOP repo (that's `team-guidebook`).

## Voice

All customer-facing copy in `content/docs/` and all agent-facing copy in `content/mcp-tools.json` follows the Notarial register defined in [`lessly-landing/.claude/skills/lessly-voice/SKILL.md`](../lessly-landing/.claude/skills/lessly-voice/SKILL.md). Open and follow it before writing or reviewing docs pages, MCP tool descriptions, or any contributor-facing strings.

The `mcp-tools.json` Layer 4 contract is enforced by `pnpm verify:ai` for the allowlisted tools in `scripts/verify-ai/mcp-tools-layer4.mjs`. When you migrate another tool to the Notarial-Terse register, extend the `ALLOWLIST` constant in that script.
