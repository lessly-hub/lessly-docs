---
name: run-local
description: Spin up the docs site locally, open it in a browser, and run the full pre-push QA workflow — dev server, banned-vocab lint, link integrity, headless browse for console errors and a11y spot-checks.
---

# Run docs.lessly.com locally

Use this when you want to see your changes in a browser before pushing, or when you need to QA a branch end-to-end without waiting for the Cloudflare Workers preview URL.

The full pipeline runs in three layers: dev server (Astro) → browser (real or headless) → automated gates (vitest, link integrity, axe a11y).

## Step 1 — Start the dev server

```bash
pnpm dev
```

Astro serves at `http://localhost:4321/`. The first start takes ~3–8s; subsequent file changes hot-reload in <1s.

If port 4321 is busy:

```bash
lsof -i:4321
# kill the stale process, then `pnpm dev` again
```

To keep the server running while you work in the same shell, background it:

```bash
pnpm dev > /tmp/lessly-docs-dev.log 2>&1 &
echo "Dev pid $!"
```

Tail the log when you need to see Astro output:

```bash
tail -f /tmp/lessly-docs-dev.log
```

## Step 2 — Open in a real browser

```bash
open http://localhost:4321/
```

Use this for visual review of typography, spacing, theme swap (`?` key opens the theme toggle button — flip dark/light to verify both modes), animations, and anything where seeing it in your normal browser matters.

## Step 3 — Drive a headless browser for repeatable QA

Use the `gstack-browse` skill for everything you'd otherwise click through by hand. The headless instance shares cookies and localStorage between commands, so multi-step flows are scriptable.

```bash
# Resolve the binary (resolves to project-local or ~/.claude install)
B=/Users/$USER/.claude/skills/gstack/browse/dist/browse

$B goto http://localhost:4321/
$B snapshot -i          # interactive elements with @e refs
$B click @e3            # click a specific button
$B snapshot -D          # unified diff of what changed
$B screenshot /tmp/x.png
```

Common docs-site checks:

```bash
# Console errors after a navigation
$B goto http://localhost:4321/docs/get-started/install
$B console --errors

# Search modal opens with ⌘K and pagefind returns results
$B press "Meta+K"
$B fill "input[type=search]" "deploy"
$B is visible ".pagefind-modular-list-result"

# Theme swap by cookie (matches Layout.astro:47-64 bootstrap)
$B js "document.cookie='lessly_theme=light; path=/'"
$B reload
$B js "document.documentElement.className"   # expect: "light"
```

## Step 4 — Run the automated gates

These mirror CI. Run all of them locally before pushing — Cloudflare Workers won't deploy if any fail.

```bash
pnpm test                  # vitest unit suite (42+ tests)
pnpm astro check           # tsc + Astro type checking
pnpm build                 # full build (Astro + Pagefind + OG generation)
pnpm check:links           # internal link integrity (run AFTER pnpm build)
pnpm check:nav-depth       # ≤ 3 directories under content/docs/
pnpm test:e2e              # Playwright happy-path + axe a11y
pnpm verify:ai             # AI surface verification (llms.txt + per-page md + /mcp/tools.json)
```

`pnpm verify:ai` needs a preview server running. Start `pnpm dev` (or `pnpm preview` against the built dist) first, then run it.

## Step 5 — Run the Lessly QA gates

Run these against the local preview URL before opening a PR. They're cheaper to run pre-push than to discover in PR review. See `AGENTS.md` → **Pre-merge gates** for the canonical list and what each one checks.

```bash
# Visual conformance against brand tokens
# (Lessly design skill — checks hex colors, spacing scale, typography)
/lessly:design audit http://localhost:4321/

# UX rules pass/fail audit (23 rules across 8 categories)
/lessly:ux audit http://localhost:4321/

# Runtime errors via PostHog ($exception events from preview traffic)
# Until the lessly:errors skill lands, use posthog:instrument-error-tracking
# to query: events WHERE event='$exception' AND $current_url CONTAINS 'localhost:4321'

# LLM answerability — can a model still answer canonical Lessly questions
# from /llms-full.txt alone? Run after edits to install.mdx or tools.mdx.
# Follow agents/docs-qa.md against http://localhost:4321.
```

## Step 6 — Clean up

```bash
# Stop the backgrounded dev server
kill $(lsof -ti:4321) 2>/dev/null || true

# If you started gstack-browse, the daemon stays alive for the next call.
# Stop it explicitly when you're done:
$B stop
```

## See also

- [`new-docs-page.md`](./new-docs-page.md) — creating a new page before you run it locally.
- [`review-docs-pr.md`](./review-docs-pr.md) — what a reviewer checks on your PR.
- [`AGENTS.md`](../AGENTS.md) — load-bearing rules + pre-merge gates.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — workflow, commit format, branch policy.
