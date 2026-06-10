# Agent instructions for docs.lessly.com

This is the customer-facing documentation site for Lessly. Astro 6 + a first-party docs engine (no Fumadocs, no Docusaurus, no Nextra). Deployed to https://docs.lessly.com via Cloudflare Workers (PR preview URLs gated by Cloudflare Access for team-only viewing).

If you are an AI agent (Claude Code, Codex, Cursor, Gemini, Copilot) working in this repo, read this file in full before opening a PR.

The full design and rationale live in [`docs/superpowers/specs/2026-05-21-docs-rewrite-design.md`](./docs/superpowers/specs/2026-05-21-docs-rewrite-design.md).

## The six load-bearing rules

1. **"Extension" is a builder concept. It NEVER appears in customer-facing content.**
   The Lessly platform is presented as one coherent product with feature areas (Deployment, Security). Internal terms like `lessly-deployment-extension` repo name stay in the codebase; they do not appear in `content/`.
2. **"Dev Console" is an internal system. It NEVER appears in customer-facing content.**
3. **No customer CLI exists today.** Lessly is consumed via (a) web sign-up at lessly.com and (b) the Lessly MCP server installed into the customer's AI agent (Claude Desktop, Cursor, VS Code, …). Do not document a CLI. Do not pretend one exists. **`MCP` is NOT banned** — it's the customer's install path and must be discussed plainly.
4. **Page-maturity status NEVER renders on the customer surface.** The `status: alpha | beta | stable` frontmatter field is a hidden editorial mark for writers and reviewers — it is required in the schema so every page declares its lifecycle stage, but it MUST NOT be rendered as a pill, badge, banner, or any other visible indicator on docs.lessly.com. Surfacing "alpha"/"beta" to readers undermines trust in the product (they infer the whole product is half-finished). If a page is genuinely not ready, signal it in prose ("This page is a stub. The full how-to lands in the next docs cycle.") — that pattern is already established. See the comment in `src/components/PageMeta.astro` for the load-bearing intent. If the spec doc disagrees, the spec doc is wrong and should be amended.
5. **Capability parity between the human path and the agent path.** Every customer capability has two first-class entries: through the UI (`app.lessly.com`) and through an agent over MCP (`mcp.lessly.com`). Anything a human can do, an agent can do. **Agent-only capabilities are allowed** (declare them with a one-line rationale on the page); **UI-only is not** — UI is a derived surface, MCP is the canonical long-term consumer. This is the documentation expression of the platform principle *"one identity model, two interfaces — both first-class"* (see [`lessly/strategy.md`](https://github.com/lessly-hub/lessly/blob/main/strategy.md)). Concretely: every `how-to` and `reference` page carries side-by-side sections labelled **"UI"** and **"MCP"**, or — for agent-only features — a single **"Agent-only"** callout naming the rationale. The agent section names the required token scope (agents always run with scoped tokens, different from a UI session). MCP is the canonical agent path in guides; REST API and CLI are mentioned as alternatives only when material. Agent discovery flows through (a) MCP tool descriptions, (b) Lessly skills, (c) the agentic surface (`/llms.txt`, per-page `.md`, `/mcp/tools.json`).
6. **CI for `lessly-docs` does not invoke LLMs.** Visual / UX / errors audits stay contributor-driven — authors run `lessly:design audit`, `lessly:ux walk`, and `lessly:errors audit` locally against the preview URL before review. CI handles structural and deterministic gates only. **Allowed in CI:** structural lints (Node.js / regex / AST), PostHog REST queries (no LLM), the existing test / build / typecheck chain, contributor checklists in templates. **Not allowed:** calling Claude or any LLM API from a GitHub Action, running `lessly:*` audit skills from CI, label-triggered LLM agents. Rationale: LLM-in-CI bills per token on every PR (most are small), adds non-deterministic failure modes (quota, prompt injection) to a deploy gate that today is fast and predictable, and local audits already cover the cases in ~30s each. When proposing a new CI gate, first check whether a deterministic script can catch it; if yes — write it; if no — it stays a contributor gate. Full rationale and precedent in [#68](https://github.com/lessly-hub/lessly-docs/issues/68).

The CI lint at `.github/workflows/ci.yml` (`lint` job) enforces rules 1 and 2 by running `scripts/check-vocab.mjs` against `content/docs/`. That script is the **single source of truth** for the banned-vocabulary list — it gates the full set (`extension`, `Dev Console`, `manifest`, `synapse`, `gateway`, `*-extension` repo names), not just the two named above; a PR containing any of them will fail. Run it locally with `pnpm check:vocab`. Rules 3, 4, 5, and 6 are enforced by review (rule 5 is also captured by checklists in the issue and PR templates).

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
pnpm verify:ai          # AI-surface schema checks (llms.txt + per-page md/mdx + /mcp/tools.json)
```

For the full local QA workflow (dev server, browser, all gates), see [`agents/run-local.md`](./agents/run-local.md).

## QA the docs as an LLM would

`pnpm verify:ai` covers the structural AI surface (the files exist, the schemas match, the text equivalence holds). It does **not** check whether an LLM can actually *answer* canonical Lessly questions from the corpus — that lives in an agent runbook: [`agents/docs-qa.md`](./agents/docs-qa.md).

Read `agents/docs-qa.md` in your Claude session and follow it against a docs URL (default `https://docs.lessly.com`, or a local `pnpm preview`, or a PR-preview URL). It fetches `/llms.txt` and `/llms-full.txt`, runs four canonical questions (three positive facts, one negative), and prints a PASS/FAIL table. Contributor self-check, not a CI gate; no API key. Run it before merging changes to `content/docs/get-started/install.mdx` or `content/docs/reference/tools.mdx`, which own the facts the questions probe.

## Pre-merge gates

Run these against the Cloudflare Workers preview URL (or `http://localhost:4321/` for local) before requesting review. Each one catches a different class of regression that the unit suite and `pnpm build` won't.

| Gate | Skill / trigger | What it catches |
|------|-----------------|-----------------|
| **Visual conformance** | `/lessly:design audit <url>` | Hardcoded hex colors, off-token spacing, type-scale violations, contrast failures against brand tokens. |
| **UX walk** | `/lessly:ux walk <url>` | Live happy-path on the preview URL: reachability, missing states (loading / empty / error), dead-end pages, CTA clarity, error copy — scored G/Y/R per check. For static rule-by-rule PASS/FAIL of a page (e.g. one-primary-CTA, single-question page), run `/lessly:ux audit` instead. |
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

All customer-facing copy in `content/docs/` and all agent-facing copy in `content/mcp-tools.json` follows the Notarial register defined in the `lessly:voice` skill (shipped via the [Lessly team plugin](https://github.com/lessly-hub/claude-lessly-plugin/tree/main/skills/voice)). Invoke it before writing or reviewing docs pages, MCP tool descriptions, or any contributor-facing strings.

The `mcp-tools.json` Layer 4 contract is enforced by `pnpm verify:ai` for the allowlisted tools in `scripts/verify-ai/mcp-tools-layer4.mjs`. When you migrate another tool to the Notarial-Terse register, extend the `ALLOWLIST` constant in that script.
