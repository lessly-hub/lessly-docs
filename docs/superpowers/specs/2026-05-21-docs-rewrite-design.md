# lessly-docs rewrite — design

**Status:** approved
**Date:** 2026-05-21
**Authors:** Artur Sabirov + Claude
**Repo:** `lessly-hub/lessly-docs`

## Problem

`docs.lessly.com` is visually ugly, half-empty (most pages are `TODO Ivan` placeholders), and built on Fumadocs — a third-party docs framework Artur no longer wants to own version risk on. The current `/` is literal "Hello World." The site needs to become an exceptional docs experience for decision-stage humans evaluating Lessly, with a co-equal AI-readable surface.

## Goals

1. Replace the Fumadocs engine with a stack where every docs-specific primitive lives in this repo.
2. Mintlify/Fern-level density, structure, and craft, with Lessly brand tokens.
3. Best-in-class build performance and minimum dependency surface.
4. Parallel AI surface (`llms.txt`, per-page `.md`/`.mdx`, MCP tool JSON) generated from one source.
5. Sliceable, vertically — every slice ships a working preview URL.

## Non-goals

- API reference (Lessly has no REST API; MCP tools replace that).
- Marketing landing page (`lessly-landing` repo owns that).
- Builder/extension authoring docs (`extensions-guide` repo owns that).
- Team SOP / internal handbook (`team-guidebook` repo owns that).

## Decisions locked

| Axis | Decision |
|---|---|
| Engine framework | **Astro 6** (was Next.js + Fumadocs) |
| Styling | Tailwind v4 (Lightning CSS) |
| Markup | `@mdx-js/mdx` + `remark-frontmatter` + `remark-mdx-frontmatter` + `remark-gfm` |
| Syntax | `shiki` + `@shikijs/transformers`, scoped `bundledLanguages` |
| Search | `pagefind` (devDep binary, static index) |
| Interactivity | Astro components + vanilla TS islands (no React in docs) |
| Icons | `lucide` (tree-shaken SVG imports) |
| Utility | `clsx` only (drop `tailwind-merge`) |
| Frontmatter | `remark-frontmatter` + `remark-mdx-frontmatter` (drop `gray-matter`) |
| Analytics | `posthog-js`, lazy-loaded prod-only |
| Aesthetic bar | Mintlify / Fern (dense, 3-column, structured) |
| Primary reader | Human dev evaluating Lessly (decision-stage); AI surface co-equal but separate |
| Content fate | Engine + visual scaffold by Claude; prose by Artur/Ivan |
| Dark default | Yes (`light` class toggles light mode) |

**Net dep reduction vs. today:** ~15 packages removed (`fumadocs-*`, `react`, `react-dom`, `tailwind-merge`, `gray-matter`, `lucide-react`, `@testing-library/*`, others).

## Architecture

### Content pipeline (build-time)

1. Astro walks `content/docs/**/*.mdx`.
2. MDX compiler parses each file. Frontmatter (`title`, `description`, `diataxis`, `status`, `updated`) is typed via an Astro Content Collection Zod schema.
3. Body compiles to static HTML at build. Shiki tokenizes code at build — zero client-side highlighter.
4. `src/lib/nav.ts` derives the sidebar tree from the file tree plus optional `_order.json` per section for explicit ordering.
5. `src/lib/toc.ts` walks the AST per page to emit a TOC from `h2`/`h3` headings.
6. After `astro build`, `pagefind` runs against the static output and generates `/pagefind/`. The search UI loads the index lazily on ⌘K.

### First-party modules

`src/content/config.ts` · `src/lib/nav.ts` · `src/lib/toc.ts` · `src/lib/og.ts` · `src/lib/llms.ts` · `src/pages/api/search.ts` plus Astro components: `Layout`, `Header`, `Sidebar`, `TOC`, `PageMeta`, `CodeBlock`, `Callout`, `Tabs`, `McpToolCard`, `OpenInClaude`, `AgentTranscript`, `FeedbackWidget`, `ThemeToggle`, `Search`.

Estimated engine + components: **~600–900 LoC**.

### AI surface (one source, seven exports)

| Route | Output | Audience |
|---|---|---|
| `/llms.txt` | Index: title + description + path | LLM discovery |
| `/llms-full.txt` | All bodies as plain markdown, concatenated | LLM bulk ingest |
| `/docs/<slug>.md` | Per-page plain markdown | LLM per-page |
| `/docs/<slug>.mdx` | Per-page raw MDX | Agentic editing |
| `/mcp/tools.json` | Machine-readable MCP tool catalog | MCP server + LLM |
| `/sitemap.xml` | Standard | Crawlers |
| `/og/<slug>.png` | Per-page OG, tokenized | Social |

All seven generated from the same Astro Content Collection by `src/lib/llms.ts`. No drift.

### Build budget

- `astro build` < 10s for ≤ 50 pages; < 30s for ≤ 200.
- Pagefind index < 5s.
- Default page weight (no interactive island on page): < 15 KB gz.
- Default page client JS: 0 bytes. Islands ship < 5 KB gz combined.

## Visual system

### Typography (Lessly tokens)

| Role | Font | Size token | Weight |
|---|---|---|---|
| Page H1 | Inter | `4xl` (2.5rem) | extrabold |
| Section H2 | Inter | `2xl` (1.75rem) | semibold |
| Sub H3 | Inter | `xl` (1.4375rem) | semibold |
| Body | Inter | `base` (1rem) | regular |
| Lead | Inter | `lg` (1.1875rem) regular, `text-text-secondary` |
| Code | Fira Mono | `sm` (0.8125rem) | regular |
| Homepage hero only | Instrument Serif | `display` (3.5625rem) | regular |

Instrument Serif is restricted to the marketing-leaning `/` hero. Docs pages stay all-Inter.

### Layout

Three columns at `lg:` and up; single-column with drawer sidebar at `md:` and below.

- Header: 56 px, sticky, `backdrop-blur`, `bg-bg-primary/80`. Logo + nav (Get Started, Guides, Concepts, Reference, Changelog) + `⌘K` search trigger + "Sign in" CTA in `bg-brand-bright`.
- Sidebar: 280 px, sticky, scrollable, current section expanded.
- Reading column: max 720 px wide, Inter base, generous line-height.
- TOC rail: 240 px, sticky, scroll-spy active state in `text-text-primary`, inactive in `text-text-tertiary`.
- Per-page footer: feedback widget, prev/next, edit-on-GitHub, last updated.

Tokens used: `bg-bg-primary` page · `bg-bg-secondary` rails · `bg-bg-elevated` code · `border-border-subtle` dividers · `text-text-primary` body · `text-text-secondary` lead/TOC · `bg-brand-bright` primary CTAs.

### Component contracts

Each component has one job. Each is tested via Playwright snapshot + a Vitest unit test where logic is non-trivial.

- `Layout` — frame; takes `frontmatter`, slots in `Sidebar`, `TOC`, `<slot/>`.
- `Header` — sticky; no state.
- `Sidebar` — renders `nav.ts` output; vanilla TS handles collapse/expand of sections.
- `TOC` — IntersectionObserver-based scroll-spy (~30 lines TS).
- `PageMeta` — Diátaxis badge (color-coded), status pill (`alpha`/`beta`/`stable`), edit-on-GitHub link, last updated.
- `CodeBlock` — pre-tokenized Shiki HTML rendered server-side; clipboard copy is ~20 lines vanilla TS; filename pill + language pill above.
- `Callout` — `info` / `note` / `warning` / `danger` / `success` variants using `bg-*-subtle` + `border-border-*` tokens.
- `Tabs` — agent variants (Claude Desktop / Claude Code / Cursor); state persisted to localStorage so the choice survives across pages (~40 lines TS).
- `McpToolCard` — name, summary, arguments table, example invocation, `OpenInClaude` CTA, related links. Data-driven from `content/mcp-tools.json`.
- `OpenInClaude` — `claude://` deep link with clipboard fallback that copies a ready-to-paste prompt.
- `AgentTranscript` — styled chat exchange (user → agent → tool result) rendered as semantic HTML, indexable by Pagefind and llms.txt.
- `FeedbackWidget` — yes/no + optional comment; POSTs `docs.feedback.submitted` to PostHog.
- `ThemeToggle` — toggles `light` class on `<html>`, persists to localStorage.
- `Search` — ⌘K modal, Pagefind UI wrapper, keyboard-navigable.

Total interactive JS shipped to the client: **< 5 KB gz combined**.

## Information architecture

| Sidebar group | Contents | Diátaxis |
|---|---|---|
| Get Started | Install · First deploy · Next steps | tutorial |
| Guides | Deploy a Next.js app · Custom domain · Roll back · Configure firewall · Observability | how-to |
| Concepts | How deployment works · Build system · Request lifecycle · Security model | explanation |
| Reference | MCP tools catalog (auto-generated) · Environment variables · Limits · Errors | reference |
| Changelog | Dated entries | — |

Diátaxis remains the underlying classifier (frontmatter + CI lint enforced). The sidebar groups by user intent, not quadrant name.

URL convention preserved: all routes stay under `/docs/*`. Root `/` becomes a real landing page (hero + three cards: Get Started, Concepts, Reference) instead of "Hello World."

## MCP-specific affordances

1. **`McpToolCard`** — the spiritual analogue of an API endpoint reference. One JSON source of truth (`content/mcp-tools.json`) powers both the docs cards and `/mcp/tools.json` route.
2. **`OpenInClaude`** — replaces Mintlify's "Try it now" curl panel. `claude://` deep link with clipboard fallback.
3. **`AgentTranscript`** — styled chat exchanges rendered as semantic HTML, not screenshots. Selectable, accessible, indexable.

## Quality gates (CI)

| Gate | Tool |
|---|---|
| Banned vocab (`extension`, `Dev Console`) | grep, existing workflow |
| Nav depth ≤ 3 | custom script |
| Frontmatter schema (Diátaxis + status) | Astro Content Collection Zod |
| Link integrity (no broken internal refs) | build-time check |
| Lighthouse: CLS ≤ 0.05, LCP ≤ 1.5s | Lighthouse CI |
| Visual regression | Playwright + per-page snapshots |
| 5-check UX audit on interactive flows | `lessly:ux` checklist in PR template |
| Type check | Astro check + `tsc --noEmit` |
| MCP tools JSON schema | Zod validation in build |

## Vertical slicing

Each slice = data + engine + component + page + live URL. Each slice ships a deployable preview URL.

| Slice | Exit criteria | Parallelizable |
|---|---|---|
| **S1 Walking skeleton** | Astro project boots; `/docs/get-started/install` renders with Lessly tokens, real header, sidebar (one entry), Pagefind index, llms.txt has one entry, Cloudflare preview deploys. | No (foundation) |
| **S2 Reading experience** | Get Started section (3 pages) reads beautifully. `Callout`, `CodeBlock` (Shiki + copy), `Tabs`, `OpenInClaude` finished. | Yes — components ‖ content scaffolds |
| **S3 Navigation experience** | Full sidebar from file tree, TOC right rail with scroll-spy, breadcrumbs, ⌘K search modal. All five sidebar groups visible in nav (Get Started, Guides, Concepts, Reference, Changelog). | Yes — Sidebar ‖ Search ‖ Header |
| **S4 MCP reference surface** | `McpToolCard`, `mcp-tools.json` source, `/reference/tools/*` pages, `/mcp/tools.json` route, `AgentTranscript` component. | Yes — data ‖ components |
| **S5 AI surface complete** | `llms.txt`, `llms-full.txt`, per-page `.md` + `.mdx`, OG image route, sitemap. Verified by an LLM crawl + answer check. | Yes — generation ‖ verification |
| **S6 Homepage + polish** | `/` landing (hero + 3 cards), 404, theme toggle, dark/light parity, feedback widget end-to-end to PostHog. | Yes — homepage ‖ widgets |
| **S7 Migration cut-over** | Fumadocs deleted; `wrangler.toml` + `astro.config.ts` swapped; Cloudflare preview URL verified end-to-end; CI green; production promoted to `docs.lessly.com`. | No (sequential) |

After S1 every subsequent slice extends a working site, not builds toward a debut.

## Subagent strategy

Per slice, dispatch parallel work to subagents:

- **Implementation streams in parallel**: each parallelizable stream within a slice runs as its own general-purpose Agent with a fully self-contained prompt (no shared mutable state during the stream).
- **gstack reviews** as gates:
  - After spec write → `gstack-eng-manager` (`/gstack-plan-eng-review`) + `gstack-designer` (`/gstack-plan-design-review`)
  - After each slice merged → `gstack-staff-engineer` (`/gstack-review`)
  - After S2, S4, S6 → `gstack-qa-lead` (`/gstack-qa-only`) headless browser walk
  - At S7 → `gstack-release-engineer` (`/gstack-land-and-deploy`)
- **Design audit** at S2 and S6 → `/lessly:design audit` against the preview URL.
- **UX audit** at S2, S3, S4, S6 → `lessly:ux` 5-check checklist on the new interactive flow.

## Rollout (don't break docs.lessly.com)

- Astro project lives under a new branch from S1 through S6. Each slice deploys to a Cloudflare Pages preview URL (Access-gated, existing pattern).
- Fumadocs build coexists in main only until S7.
- S7 PR: delete `next.config.mjs`, `source.config.ts`, `proxy.ts`, `fumadocs-*` deps, `src/app/` (Next-specific routes), add `astro.config.ts`, swap `wrangler.toml` to Astro's Cloudflare adapter output.
- All `/docs/*` URLs are path-stable; the existing `/` redirect to `/docs/get-started` is replaced by a real homepage. No redirects needed.
- Rollback: revert the cut-over PR; Fumadocs build returns. Preview branch URLs of Astro remain accessible until cleaned up.

## Testing strategy

- **Unit (Vitest)**: pure-TS modules — `nav.ts`, `toc.ts`, `llms.ts`, frontmatter validators, `mcp-tools.json` schema.
- **Component (Playwright)**: per-component story-style rendering with snapshot.
- **End-to-end (Playwright)**: full happy-path walks of Get Started, Guide page, MCP tool reference page, Search, Theme toggle, Feedback submission.
- **AI surface (verification script)**: a small Node script fetches `/llms.txt`, picks a known fact, sends it to Claude via Anthropic SDK with the fact's source paragraph from `/llms-full.txt`, asserts the answer is correct.
- **Visual regression**: Playwright snapshots for each page type in both dark and light modes.

## Acceptance (definition of done)

- All seven slices merged.
- All CI gates green on `main`.
- `gstack-review` passes on the cut-over PR.
- `lessly:design audit` returns `clean` on `https://docs.lessly.com`.
- `lessly:ux` returns `clean` on each interactive flow.
- A spot-check LLM crawl successfully answers three known questions using only `/llms.txt` + `/llms-full.txt`.
- Build time on CI ≤ 60 s including Pagefind + Playwright.
- Lighthouse on three representative pages: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.

## Open questions resolved during this design

- *Replace Fumadocs or customize it?* → Replace (full ownership preference; locked).
- *Keep Diátaxis?* → Yes, as a frontmatter classifier; rename the sidebar groups to user-intent labels.
- *Pricing page?* → Drop from docs; one footer link to `lessly.com/pricing`.
- *React or no React?* → No React. Astro components + vanilla TS islands.
- *Custom search infra?* → Pagefind. Static, ~30 KB client, zero infra.
- *"Try it now" for MCP?* → `OpenInClaude` deep link + clipboard fallback + `AgentTranscript` for read-only flows.

## Out-of-scope follow-ups (not blocking)

- i18n. Site is English-only by policy; revisit if a non-English market opens.
- Interactive playgrounds beyond `OpenInClaude` (full embedded MCP chat) — future slice.
- Per-page analytics dashboards. PostHog has all the data; a curated dashboard in `/team-guidebook` is enough for now.
