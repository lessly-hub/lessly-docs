# Contributing to lessly-docs

This is the customer-facing documentation site for Lessly. Before contributing, read [`AGENTS.md`](./AGENTS.md).

## Language

All content is **English**. PR titles and bodies are also English (overrides the lessly-hub default of Russian via my-tov — customer docs are public).

## Workflow

1. Branch from `main`. No direct pushes.
2. Pick a Diátaxis page type before writing — see [`agents/new-docs-page.md`](./agents/new-docs-page.md).
3. Open a PR. Cloudflare Pages posts a preview URL.
4. CI must pass: banned-vocab lint, nav-depth check (Task 1.4); Lighthouse CLS, Playwright visual regression (Tasks 7.1, 7.2 — once enabled).
5. Area DRI reviews. See [`.github/CODEOWNERS`](./.github/CODEOWNERS) for assignments.
6. Squash and merge.

## Banned vocabulary

Customer-facing content never uses: `extension`, `Dev Console`, `manifest`, `synapse`, `gateway`, `*-extension` repo names. CI fails the PR if `extension` or `Dev Console` appears in `content/`. The other four are review-enforced — flag them in PR review, don't merge without a fix.

`MCP` is **not** banned — it's the customer install path. Use it plainly.

## Commit format

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `style:`, `ci:`. English titles.
