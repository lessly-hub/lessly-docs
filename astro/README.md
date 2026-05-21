# lessly-docs-astro

Astro 6 rewrite of `docs.lessly.com`. Coexists with the Next.js + Fumadocs build at the repo root until S7.

See [`../docs/superpowers/specs/2026-05-21-docs-rewrite-design.md`](../docs/superpowers/specs/2026-05-21-docs-rewrite-design.md) for the full design.

## Quickstart

```bash
pnpm install
pnpm dev                # astro dev server on :4321
pnpm build              # builds to dist/{client,server}
pnpm pagefind           # static search index in dist/client/pagefind/
pnpm build:all          # build + pagefind in one shot
```

## Layout

```
astro/
  package.json
  astro.config.ts          # Cloudflare adapter, MDX, Tailwind v4 via Vite
  wrangler.toml            # base Worker config (build artifact lives in dist/server/)
  tsconfig.json
  content/
    docs/                  # MDX content. Astro Content Layer glob loader points here.
  src/
    components/            # .astro components — no React
      Layout.astro
      Header.astro
      Sidebar.astro
      PageMeta.astro
    content.config.ts      # Astro Content Collection schema (Zod)
    lib/
      cn.ts                # clsx-only utility
      nav.ts               # sidebar tree (hardcoded in S1, file-tree in S3)
      llms.ts              # llms.txt generator
    pages/
      index.astro          # static redirect → /docs/get-started/install
      docs/[...slug].astro # MDX rendering pipeline
      llms.txt.ts          # AI-readable index
    styles/
      global.css           # Tailwind v4 entry + Lessly token map
```

## Preview against the Worker

The Cloudflare adapter emits a resolved `dist/server/wrangler.json` during `astro build`. Point `wrangler dev` at it:

```bash
pnpm build
npx wrangler dev --config dist/server/wrangler.json --port 8787
```

`pnpm preview` is wired to `wrangler dev` for convenience (against the root `wrangler.toml`).

## Pagefind on Cloudflare Workers — S1 spike result

**Status: PASS.** With `output: 'static'` and the Cloudflare adapter, all docs pages are prerendered into `dist/client/`. After `pnpm pagefind` the index lives at `dist/client/pagefind/`. Cloudflare's `[assets]` binding serves `/pagefind/pagefind.js` directly with `200 text/javascript` — the Worker does not intercept. No fallback (e.g. routing through `/_pagefind/*`) was needed.

If a future slice flips a page back to server-rendered (e.g. `/api/search`), keep that page out of the `/pagefind/*` namespace.

## Theme

Dark is default. `.light` class on `<html>` swaps to light mode. S1 wires `prefers-color-scheme: light` via inline script in `Layout.astro`. The visible theme toggle is deferred (see spec §AI-slop kills).

## Token system

Tokens are defined in `src/styles/global.css`:

- Resolved hex values from `~/.claude/plugins/cache/apliteni/lessly/3.10.0/skills/design/brand-tokens.md`.
- CSS custom properties on `:root` (dark) and `.light` (light).
- Re-exposed as Tailwind v4 `@theme` so utilities like `bg-bg-primary`, `text-text-secondary`, `border-border-subtle` resolve.

Never hardcode hex.
