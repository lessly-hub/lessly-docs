# Scoped-tab navigation — design

**Date:** 2026-05-22
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

The top header and the left sidebar duplicate navigation. The 5 top-level
section names — Get Started, Guides, Concepts, Reference, Changelog — render
twice: as horizontal links in `Header.astro` and as collapsible group headers
in `Sidebar.astro`.

There is also a second, code-level duplication: the header links are a
hardcoded `navLinks` array (`Header.astro:8-14`) that mirrors
`content/docs/_groups.json` by hand, so the header can silently drift from the
sidebar's source of truth.

A third, pre-existing gap: there is no doc navigation below 1024px. Header
links are `hidden md:flex` (≥768px) and the sidebar is `hidden lg:block`
(≥1024px), leaving a dead band at 768–1023px (sections switchable, pages
invisible) and no navigation at all below 768px.

## Chosen approach — Scoped tabs

Header section links become **context-switching tabs**. The sidebar shows
**only the active section's pages**, so the 5 group labels stop repeating. This
is the Stripe / Tailwind / Vercel docs model. Mobile is included via a drawer.

## Design

### A. One source of truth

Both the header tabs and the sidebar derive from `getNav()`. The hardcoded
`navLinks` array in `Header.astro` is deleted. `content/docs/_groups.json`
remains the single source for section order and labels.

Add two pure helpers to `src/lib/nav.ts`, shared by Header, Sidebar, and the
mobile drawer so "active section" is computed identically everywhere and is
unit-testable:

- `activeGroupId(path: string): string` — given a pathname, return the
  matching group id (e.g. `/docs/guides/webhooks` → `guides`). Normalizes a
  trailing slash. Returns `''` when the path matches no known group; callers
  fall back to the first group in `_groups.json` order.
- `sectionHref(group: NavGroup): string` — the section's landing URL: the
  group's `index` page if present, otherwise its first item's `href`.

### B. Three surfaces, split at one breakpoint (`lg` = 1024px)

This replaces today's mismatched `md`/`lg` split.

- **≥1024px (`lg`):** header **tabs** (section switchers; the tab for the
  current section gets `aria-current` and a brand/underline treatment) **plus**
  the left **sidebar** showing only the active section's pages as a flat list.
  No hamburger.
- **<1024px:** a **hamburger** button (`lg:hidden`) opens a slide-in **drawer**
  containing the full collapsible nav tree (all sections + their pages, active
  section expanded). No tabs, no sidebar below `lg`.

### C. Collapse logic relocates (nothing wasted)

The desktop sidebar becomes a flat, always-visible list of one section, so its
collapse/expand + `localStorage` persistence machinery is dead weight there.
That exact logic moves into the new mobile drawer, which needs it (many
sections). It is relocated, not deleted.

### D. Files touched

- `src/components/Header.astro` — render tabs from `getNav()` with active
  state; accept a `currentPath` prop; add the hamburger trigger (`lg:hidden`).
- `src/components/Sidebar.astro` — render only the active group's items as a
  flat list; remove the collapse `<script>` and toggle markup.
- `src/components/MobileNav.astro` *(new)* — the drawer. Reuses the
  `Search.astro` `<dialog>` + focus-trap pattern for open/close/Esc/backdrop,
  and the relocated collapsible-tree logic for the section groups.
- `src/components/Layout.astro` — pass `currentPath` to `<Header>`; mount
  `<MobileNav>`.
- `src/lib/nav.ts` — add `activeGroupId` and `sectionHref`.

### E. Behavior details / defaults

- Drawer slides from the **left**; the hamburger sits **left of the logo**.
- Tabs render only at `≥lg`, where all 5 fit comfortably — no tab-overflow
  handling needed.
- The header is rendered on every page, including `bare` pages (homepage,
  404). On those, tabs still render but none is active. `Header.astro`
  frontmatter may `await getNav()`; it is already a server component.
- A section tab links to `sectionHref(group)`. Being on any page within that
  section marks the tab active via `activeGroupId(currentPath)`.

## Testing

- **Unit (vitest):** `activeGroupId` (match, trailing slash, no-match
  fallback) and `sectionHref` (index present vs. first-item fallback).
- **E2E (playwright):** active tab matches the current section; the desktop
  sidebar lists only the active section's pages; the mobile drawer
  opens/closes, traps focus, and lists all sections; existing
  `check:nav-depth` and link checks stay green.
- **Accessibility:** axe checks on the tab bar (`aria-current` on the active
  tab) and the drawer (focus trap, Esc to close), mirroring the existing
  `Search.astro` dialog behavior.

## Risks / edge cases

- A `/docs/...` page outside the 5 known groups would have no active section;
  `activeGroupId` returns `''` and callers fall back to the first group. CI
  link/nav-depth checks make such pages unlikely, but the fallback is defined.
- Header becomes async (`await getNav()`); acceptable since it is
  server-rendered at build time.
- The 768–1023px band changes from "tabs only" to "hamburger drawer." This is
  intentional and resolves the current dead band where pages were unreachable.

## Out of scope

- No change to the doc content model, `_groups.json` schema, or `_order.json`
  rules.
- No change to the right-hand TOC (`TOC.astro`) or breadcrumbs.
