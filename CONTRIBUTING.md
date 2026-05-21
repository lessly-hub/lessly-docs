# Contributing to lessly-docs

This is the customer-facing documentation site for Lessly. Built on Astro 6 with a first-party docs engine. Before contributing, read [`AGENTS.md`](./AGENTS.md).

## Language

All content is **English**. PR titles and bodies are also English (overrides the lessly-hub default of Russian via my-tov — customer docs are public).

## Workflow

1. Branch from `main`. No direct pushes.
2. Pick a Diátaxis page type before writing — see [`agents/new-docs-page.md`](./agents/new-docs-page.md).
3. Open a PR. Cloudflare Workers posts a preview URL.
4. CI must pass: banned-vocab lint, nav-depth check, typecheck, vitest unit suite, build + pagefind + OG generation, link integrity, Playwright E2E + axe a11y, AI surface verification, Lighthouse CLS budget.
5. Area DRI reviews. See [`.github/CODEOWNERS`](./.github/CODEOWNERS) for assignments.
6. Squash and merge.

## Local development

```bash
pnpm install
pnpm dev                # astro dev server on :4321
pnpm build              # builds to dist/{client,server} + generates OG images
pnpm test               # vitest
pnpm test:e2e           # Playwright + axe
pnpm check:links        # internal link integrity (run after pnpm build)
pnpm check:nav-depth    # ≤ 3 directories deep under content/docs/
pnpm verify:ai          # AI surface checks (needs a running preview)
```

## Banned vocabulary

Customer-facing content never uses: `extension`, `Dev Console`, `manifest`, `synapse`, `gateway`, `*-extension` repo names. CI fails the PR if `extension` or `Dev Console` appears in `content/`. The other four are review-enforced — flag them in PR review, don't merge without a fix.

`MCP` is **not** banned — it's the customer install path. Use it plainly.

## Commit format

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `style:`, `ci:`. English titles.

## Spec

See [`docs/superpowers/specs/2026-05-21-docs-rewrite-design.md`](./docs/superpowers/specs/2026-05-21-docs-rewrite-design.md) for the full design and the rationale behind the first-party engine choice.
