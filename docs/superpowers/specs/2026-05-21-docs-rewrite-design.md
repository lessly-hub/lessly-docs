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
| Cloudflare target | **Workers** via `@astrojs/cloudflare`, `output: 'directory'`, `[assets]` binding to `./dist` |
| Prerender policy | All `/docs/*`, `/llms*.txt`, `/mcp/tools.json`, `/sitemap.xml`, `/og/*` are `export const prerender = true`. Only `/api/*` runs on the Worker. |
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
4. `src/lib/nav.ts` derives the sidebar tree from the file tree plus optional `_order.json` per section. **Conflict rules (CI-linted):** every file in a section MUST appear in `_order.json` if `_order.json` exists; entries in `_order.json` MUST resolve to a file; unknown or unresolved entries fail the build.
5. `src/lib/toc.ts` walks the AST per page to emit a TOC from `h2`/`h3` headings.
6. After `astro build`, `pagefind` runs against the static output and generates `/pagefind/`. The search UI loads the index lazily on ⌘K.

### First-party modules

`src/content/config.ts` · `src/lib/nav.ts` · `src/lib/toc.ts` · `src/lib/og.ts` · `src/lib/llms.ts` · `src/pages/docs/[...slug].mdx.ts` (raw MDX endpoint) · `src/pages/docs/[...slug].md.ts` (plain-MD endpoint) · `src/pages/api/search.ts` plus Astro components: `Layout`, `Header`, `Sidebar`, `TOC`, `PageMeta`, `CodeBlock`, `Callout`, `Tabs`, `McpToolCard`, `OpenInClaude`, `AgentTranscript`, `Search`.

Estimated engine + components: **~600–900 LoC**.

### AI surface (one source, seven exports)

| Route | Output | Audience |
|---|---|---|
| `/llms.txt` | Index: title + description + path | LLM discovery |
| `/llms-full.txt` | All bodies as plain markdown, concatenated | LLM bulk ingest |
| `/docs/<slug>.md` | Per-page plain markdown | LLM per-page |
| `/docs/<slug>.mdx` | Per-page raw MDX served by `src/pages/docs/[...slug].mdx.ts`, `content-type: text/markdown; charset=utf-8`, body is the unprocessed file | Agentic editing |
| `/mcp/tools.json` | Machine-readable MCP tool catalog | MCP server + LLM |
| `/sitemap.xml` | Standard | Crawlers |
| `/og/<slug>.png` | Per-page OG, tokenized | Social |

All seven generated from the same Astro Content Collection by `src/lib/llms.ts`. No drift.

### Build budget

- `astro build` < 10s for ≤ 50 pages; < 30s for ≤ 200, excluding OG image generation.
- `/og/*.png` cached by content hash; cold OG build budgeted separately at ≤ 60s for 200 pages.
- Pagefind index < 5s.
- Default page weight (no interactive island on page): < 15 KB gz.
- Default page client JS: 0 bytes. Islands ship < 5 KB gz combined.

## Visual system

### Typography (Lessly tokens)

| Role | Font | Size token | Weight | Line-height |
|---|---|---|---|---|
| Page H1 | Inter | `4xl` (2.5rem) | extrabold | 1.1 |
| Section H2 | Inter | `2xl` (1.75rem) | semibold | 1.2 |
| Sub H3 | Inter | `xl` (1.4375rem) | semibold | 1.3 |
| Body | Inter | `base` (1rem) | regular | 1.6 |
| Lead | Inter | `lg` (1.1875rem) regular, `text-text-secondary` | regular | 1.5 |
| Code | Fira Mono | `sm` (0.8125rem) | regular | 1.55 |
| Homepage hero only | Instrument Serif | `display` (3.5625rem) | regular | 1.05 |

Instrument Serif is restricted to the marketing-leaning `/` hero. Docs pages stay all-Inter.

Reading measure: **68ch**, clamped at 720px. Inter feature flags: `"ss01", "cv11"`. Tables use tabular nums.

### Spacing (vertical rhythm)

| Surface | Value |
|---|---|
| Sidebar item row | 32 px (12 px vertical padding) |
| TOC item row | 28 px |
| H2 top margin / bottom margin | 48 px / 16 px |
| H3 top margin / bottom margin | 32 px / 12 px |
| Paragraph spacing | 16 px |
| Code block surround | 24 px |
| Column gutter (3-col) | 48 px at lg, 32 px at md |

### Token map (every surface named)

| Surface | Token |
|---|---|
| Page background | `bg-bg-primary` |
| Sidebar / TOC rail | `bg-bg-secondary` |
| Code block background | `bg-bg-elevated` |
| Inline code background | `bg-bg-elevated`, text `text-brand-bright` |
| Body text | `text-text-primary` |
| Lead / TOC inactive | `text-text-secondary` / `text-text-tertiary` |
| Eyebrow label | `text-text-tertiary` (text-xs uppercase, letter-spacing 0.04em) |
| Link default | `text-brand-bright`, underline offset 3 px, thickness 1 px |
| Link hover | `text-brand-bright`, underline thickness 2 px |
| Focus ring | `ring-2 ring-brand-bright ring-offset-2 ring-offset-bg-primary` |
| Selection | `bg-brand-bright/30` |
| Primary CTA | `bg-brand-bright`, `text-text-on-brand` |
| Divider | `border-border-subtle` |

### Layout

- 3-col at **≥ 1280 px**: sidebar (280) + reading (max 720) + TOC rail (240), gutters 48 px.
- 2-col at **1024–1279 px**: sidebar + reading; TOC rail hidden.
- 1-col at **< 1024 px**: drawer sidebar; no TOC rail.
- TOC rail hides when the page has fewer than 2 `h2` headings.

- Header: 56 px, sticky, `backdrop-blur`, `bg-bg-primary/80`. Logo + nav (Get Started · Guides · Concepts · Reference · Changelog) + `⌘K` search trigger + "Sign in" CTA in `bg-brand-bright`.
- Sidebar: 280 px, sticky, scrollable, current section expanded.
- Reading column: max 720 px (≈ 68ch).
- TOC rail: 240 px, sticky, IntersectionObserver scroll-spy.
- Per-page footer: prev/next, edit-on-GitHub, last updated. **(`FeedbackWidget` deferred — see §AI-slop kills below.)**

### Page-header pattern

Every docs page header follows this sequence with no decoration between rows:

1. Diátaxis **eyebrow** label: `Tutorial` / `How-to` / `Explanation` / `Reference`. Text only — no badge, no color (one neutral token `text-text-tertiary`, `text-xs uppercase`, letter-spacing 0.04em).
2. `<h1>` page title.
3. Lead paragraph: `text-lg text-text-secondary`.
4. Status pill row: `alpha` / `beta` / `stable` (color reserved here).

### Component contracts

Each component has one job. Each is tested via Playwright snapshot + a Vitest unit test where logic is non-trivial.

- `Layout` — frame; takes `frontmatter`, slots in `Sidebar`, `TOC`, `<slot/>`.
- `Header` — sticky; no state.
- `Sidebar` — renders `nav.ts` output; vanilla TS handles collapse/expand of sections.
- `TOC` — IntersectionObserver-based scroll-spy. Initial active heading derived from `location.hash` on load (not from IO). Short pages pin the last heading. `prefers-reduced-motion` disables smooth scroll. Falls back to first heading if no IO support.
- `PageMeta` — neutral Diátaxis eyebrow (no color), status pill, edit-on-GitHub link, last-updated.
- `CodeBlock` — pre-tokenized Shiki HTML rendered server-side; clipboard copy ≈ 20 lines vanilla TS; filename pill + language pill above. Line numbers off by default, on via frontmatter flag. Line highlighting `{1,3-5}` syntax. Diff variant: `+` green tint, `-` red tint, no language pill. Terminal variant: no copy button, no filename pill, prompt char dimmed. Long lines: horizontal scroll, no wrap.
- `Callout` — three variants only: `note` / `warning` / `danger`. Uses `bg-*-subtle` + `border-border-*` tokens. Each has one named lucide icon and a one-line use rule. Anti-pattern: do not wrap an entire section in a callout. `info` and `success` are banned (write prose).
- `Tabs` — agent variants (Claude Desktop / Claude Code / Cursor). State precedence: URL `?tab=` query param > localStorage > frontmatter `defaultTab` > first tab. URL wins so deep links land on the intended variant. ≈ 40 lines TS.
- `McpToolCard` — name (mono), summary, arguments table (columns: name [mono], type [mono, `text-text-tertiary`], required [• / —], description), example invocation (`CodeBlock` with filename pill "Claude Code"), `OpenInClaude` CTA, related links (max 3). Data-driven from `content/mcp-tools.json`.
- `OpenInClaude` — `claude://` deep link with clipboard fallback. Clipboard text is verbatim: `Run the {tool_name} MCP tool with: {example_args}`. Button shows "Open in Claude"; on copy, swaps to "Copied — paste into Claude" for 2 s.
- `AgentTranscript` — rendered as `<ol role="log" aria-label="Agent transcript">` of `<li>` turns. Each turn has a visually-hidden speaker label (`<span class="sr-only">User said:</span>`). Tool results are `<figure>` with `<figcaption>` (filename pill = tool name). Turns separated by 16 px gap. Role labels left-aligned, `text-xs uppercase`: USER (`text-text-secondary`), CLAUDE (`text-brand-bright`), TOOL (`text-text-tertiary`). Tool results render inside a `bg-bg-elevated` block. Passes axe-core in tests.
- `Search` — ⌘K modal, Pagefind UI wrapper, keyboard-navigable.

**Deferred from MVP (see §AI-slop kills):**
- `FeedbackWidget` — deferred to post-S6 behind a config flag. PostHog page-view + scroll depth covers 80% of the same signal.
- Visible `ThemeToggle` — deferred. Ship dark/light token system in S1, respect `prefers-color-scheme` by default, add the visible toggle only when a real user need surfaces.

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

URL convention preserved: all routes stay under `/docs/*`. Root `/` becomes a real landing page: Instrument Serif H1 + one-sentence lead + one primary CTA to `/docs/get-started/install`, over a single content column. **No card grid** (the 3-card layout is the most recognizable AI-slop pattern). Secondary nav links to Concepts and Reference are inline below the CTA.

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
- Rollback: revert the cut-over PR **and** re-run the Cloudflare deploy from the reverted commit. (The cut-over PR swaps `wrangler.toml`, so a code-only revert leaves the Worker pointing at a non-existent build output.) Keep the prior `.open-next` build artifact tagged for fast re-promotion. Preview branch URLs of Astro remain accessible until cleaned up.

## Testing strategy

- **Unit (Vitest)**: pure-TS modules — `nav.ts`, `toc.ts`, `llms.ts`, frontmatter validators, `mcp-tools.json` schema, `_order.json` conflict rules.
- **Component (Playwright)**: per-component story-style rendering with snapshot.
- **End-to-end (Playwright)**: happy-path walks of Get Started, a Guide page, an MCP tool reference page, ⌘K Search, and `OpenInClaude` deep link.
- **AI surface**:
  (a) JSON-schema test for `/mcp/tools.json` — Zod parse and round-trip equality against `content/mcp-tools.json`;
  (b) text-equivalence test asserting `/docs/<slug>.md` plain text matches the rendered HTML's `textContent` modulo whitespace, for every page;
  (c) Anthropic SDK answer-correctness test on **3 known facts** AND **1 negative** ("fact not in corpus → model declines / says unknown");
  (d) `/llms.txt` listing equals the Content Collection's published-status entries.
- **Accessibility**: axe-core in Playwright; `AgentTranscript`, `McpToolCard`, sidebar, TOC, search modal must pass with zero violations.
- **Visual regression**: Playwright snapshots for each page type in both color schemes. Snapshot budget: ≤ 30 snapshots total to keep CI < 60 s; do not snapshot every page × every viewport.

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

## AI-slop kills (applied this revision)

Items the design review flagged as decorative-only. Removed or deferred:

1. **Homepage card grid** — killed. Replaced with single CTA over single column. The 3-card "Get Started / Concepts / Reference" grid is the most recognizable AI-slop layout.
2. **`FeedbackWidget` on every page** — deferred to post-S6. PostHog page-view + scroll depth covers 80% of the signal without spending user attention.
3. **Visible `ThemeToggle`** — deferred. Ship the dark/light token system in S1, respect `prefers-color-scheme` for now. Add the toggle only when a real user need surfaces.
4. **Color-coded Diátaxis badges** — killed. Replaced with a single neutral eyebrow label. Color reserved for the status pill where it carries meaning.
5. **Callout variants `info` and `success`** — banned. Three variants (`note`, `warning`, `danger`) cover the real use cases. `success` belongs in prose.

## Known risks tracked (do not block S1)

- **Snapshot explosion in visual regression**: capped at 30 total snapshots; do not snapshot every page × every viewport × both themes.
- **PostHog late-load race for events fired in the first second**: queue events into a `window.__lessly_queue` and flush on PostHog ready. Applies whenever PostHog returns from deferral.
- **CSP for `claude://` scheme**: explicitly allow in `Content-Security-Policy` or accept that Firefox blocks silently; document the latter as a Firefox-only limitation in the OpenInClaude reference.
- **Pagefind on Cloudflare Workers `[assets]` routing**: S1 includes a 30-minute spike to verify `/pagefind/*` requests serve from `[assets]` and the Worker does not intercept them. Fallback: move Pagefind index to a subroute or use `@astrojs/cloudflare`'s static-asset mode.

## Out-of-scope follow-ups (not blocking)

- i18n. Site is English-only by policy; revisit if a non-English market opens.
- Interactive playgrounds beyond `OpenInClaude` (full embedded MCP chat) — future slice.
- Per-page analytics dashboards. PostHog has all the data; a curated dashboard in `/team-guidebook` is enough for now.
