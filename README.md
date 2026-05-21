# lessly-docs

Customer-facing documentation site for [Lessly](https://lessly.com), published at https://docs.lessly.com.

Built on Astro 6 with a first-party docs engine (no third-party docs framework). Cloudflare Workers handles delivery; static prerender + Pagefind handles search.

See [`docs/superpowers/specs/2026-05-21-docs-rewrite-design.md`](./docs/superpowers/specs/2026-05-21-docs-rewrite-design.md) for the full design and the rollout that landed it.

## For contributors

Before opening a PR, read [`AGENTS.md`](./AGENTS.md). For workflow specifics see [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`agents/`](./agents/).

## Quickstart

```bash
pnpm install
pnpm dev                # astro dev server on :4321
pnpm build              # builds to dist/{client,server} + generates OG images
pnpm pagefind           # static search index in dist/client/pagefind/
pnpm build:all          # build + pagefind in one shot
```

## Verification

```bash
pnpm test               # vitest unit tests
pnpm check:links        # internal link integrity (against dist/)
pnpm check:nav-depth    # ≤ 3 levels deep under content/docs/
pnpm test:e2e           # Playwright smoke + axe a11y
pnpm verify:ai          # AI surface checks (llms.txt, /docs/*.md, /mcp/tools.json)
```

## Layout

```
astro.config.ts          # Cloudflare adapter, MDX, Tailwind v4 via Vite
wrangler.toml            # base Worker config (build artifact lives in dist/server/)
tsconfig.json
content/
  docs/                  # MDX content. Astro Content Layer glob loader points here.
  mcp-tools.json         # MCP tool catalog (source of /mcp/tools.json)
src/
  components/            # .astro components — no React
    Layout.astro
    Header.astro
    Sidebar.astro
    PageMeta.astro
  content.config.ts      # Astro Content Collection schema (Zod)
  lib/
    cn.ts                # clsx-only utility
    nav.ts               # sidebar tree from file system
    llms.ts              # llms.txt generator
  pages/
    index.astro          # homepage
    docs/[...slug].astro # MDX rendering pipeline
    llms.txt.ts          # AI-readable index
  styles/
    global.css           # Tailwind v4 entry + Lessly token map
scripts/
  generate-og.mjs        # Open Graph image generation (run as part of build)
  check-links.mjs        # internal link integrity
  check-nav-depth.mjs    # depth lint for content/docs
  verify-ai/             # AI surface verification suite
public/                  # static assets (favicons, fonts, logos)
tests/
  unit/                  # vitest unit suite
  e2e/                   # Playwright happy-path + axe
```

## Preview against the Worker

The Cloudflare adapter emits a resolved `dist/server/wrangler.json` during `astro build`. Point `wrangler dev` at it:

```bash
pnpm build
npx wrangler dev --config dist/server/wrangler.json --port 8787
```

`pnpm preview` is wired to `wrangler dev` for convenience (against the root `wrangler.toml`).

## Pagefind on Cloudflare Workers

With `output: 'static'` and the Cloudflare adapter, all docs pages are prerendered into `dist/client/`. After `pnpm pagefind` the index lives at `dist/client/pagefind/`. Cloudflare's `[assets]` binding serves `/pagefind/pagefind.js` directly with `200 text/javascript` — the Worker does not intercept. If a future slice flips a page back to server-rendered (e.g. `/api/search`), keep that page out of the `/pagefind/*` namespace.

## URL convention

Docs URLs are path-based on `/docs/*`. The current subdomain (`docs.lessly.com`) is a temporary host; future migration to `lessly.com/docs/*` preserves all paths.

The root URL `/` permanently redirects to `/docs/get-started`.

## Theme

Dark is default. `.light` class on `<html>` swaps to light mode. `prefers-color-scheme: light` is wired via inline script in `Layout.astro`. The visible theme toggle is deferred (see spec §AI-slop kills).

## Token system

Tokens are defined in `src/styles/global.css`:

- Resolved hex values from `~/.claude/plugins/cache/apliteni/lessly/3.10.0/skills/design/brand-tokens.md`.
- CSS custom properties on `:root` (dark) and `.light` (light).
- Re-exposed as Tailwind v4 `@theme` so utilities like `bg-bg-primary`, `text-text-secondary`, `border-border-subtle` resolve.

Never hardcode hex.

## Analytics

Pageviews and feedback events flow to PostHog. The site is a no-op for analytics when env vars are unset (local dev, CI, preview without secrets).

Required env vars (set in Cloudflare dashboard for production + preview):

- `PUBLIC_POSTHOG_KEY` — Lessly's PostHog project key (project ID `148551`).
- `PUBLIC_POSTHOG_HOST` — PostHog instance URL (defaults to `https://eu.posthog.com` if unset).

Events captured follow Lessly's `<domain>.<entity>.<verb-past>` naming convention.
