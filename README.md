# lessly-docs

Customer-facing documentation site for [Lessly](https://lessly.com), published at https://docs.lessly.com.

## For contributors

Before opening a PR, read [`AGENTS.md`](./AGENTS.md). For specific workflows see [`agents/`](./agents/).

## Local development

```bash
pnpm install
pnpm dev
```

Server runs on http://localhost:3000.

## Tech

Next.js · Fumadocs · Tailwind CSS · Lessly design tokens · Cloudflare Pages.

## URL convention

Docs URLs are path-based on `/docs/*`:

- `/docs/get-started`
- `/docs/deployment`
- `/docs/deployment/build-system`

The site currently serves from `docs.lessly.com` for operational reasons (independent deploy, different stack from the marketing site). The canonical destination is `lessly.com/docs/*` — paths are designed to survive that migration unchanged. Don't restructure routes to strip the `/docs/` prefix.

The root URL `/` permanently redirects to `/docs/get-started`.

## Analytics

Pageviews and feedback events flow to PostHog. The site is a **no-op for analytics** when the env vars below are unset (local dev, CI workflows, preview deploys without secrets).

Required env vars (set in Cloudflare Pages dashboard for production + preview):

- `NEXT_PUBLIC_POSTHOG_KEY` — Lessly's PostHog project key (project ID `148551`).
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog instance URL (defaults to `https://eu.posthog.com` if unset).

Events captured:
- `docs.page.viewed` with `{ path, diataxis }` on every route change.
- `docs.feedback.submitted` with `{ path, value: 'up' | 'down' }` from the page-footer widget.

Both events follow Lessly's `<domain>.<entity>.<verb-past>` naming convention. Register them in PostHog UI (Data management → Events) after the first capture lands.
