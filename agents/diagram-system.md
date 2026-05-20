---
name: diagram-system
description: How to create a Lessly-branded diagram for docs.lessly.com — Figma for heroes, D2 for inline. Includes the token-aware theme step.
---

# Diagrams for docs.lessly.com

Two-tier system:

1. **Hero diagrams** — designer-touched in Figma, one per Explanation page.
2. **Inline diagrams** — programmatic, D2, for sequences and quick flows.

Both get the same theme treatment so they render correctly in dark and light mode without re-export.

## Prerequisites

- The D2 CLI installed locally. `brew install d2` on macOS, or `curl -fsSL https://d2lang.com/install.sh | sh` on Linux. Confirm with `d2 --version`.

## Hero diagrams (Figma)

### Style conventions (copy these from existing docs heroes)

- **Section labels:** uppercase Fira Mono. Examples: `VERCEL FIREWALL`, `COMPUTE LAYER`. Communicates "infrastructure register" without being unfriendly.
- **Region boundaries:** dashed border (1px, `border-border-subtle` in dark mode).
- **Box shapes:** rounded rectangles, radius 12, soft drop-shadow (`shadow-sm` token).
- **Connectors:** 1px lines with arrowheads. Active path in `--bg-bg-brand-bright`; passive in `--text-text-tertiary`.
- **State pills:** reuse the `B.badge` component shape — rounded-full, padding 3px 10px, icon + label. Examples: 🟢 `Hit`, 🔴 `Miss`, 🟡 `Stale hit (ISR)`. Use Lessly success / danger / warning tokens.
- **Body labels:** Inter, sentence case.
- **Icons:** lucide icons exported from Figma, sized 16–24px.

### Workflow

1. Open the Figma file `lessly-design / docs-diagrams` (link in repo `README.md`).
2. Duplicate the "Template — Architecture diagram" frame.
3. Lay out your diagram following the conventions above.
4. Export the frame as SVG. Save to `public/diagrams/<page-slug>.svg`.
5. Run `pnpm theme-diagrams` from the repo root — this rewrites hex literals to `var(--*)` tokens.
6. Reference in MDX: `<HeroDiagram src="/diagrams/build-system.svg" alt="…" />`.

The diagram now switches with the theme toggle automatically.

## Inline diagrams (D2)

Use D2 when you need a quick sequence, a small flow, or anything that doesn't justify a Figma round-trip.

### Authoring

1. Author the D2 file under `content/docs/<area>/<slug>.d2`. See [d2lang.com](https://d2lang.com) for syntax.
2. Render it once locally: `pnpm d2-render content/docs/<area>/<slug>.d2 public/diagrams/<slug>.svg`. This invokes the D2 CLI and then applies `theme-diagrams` so the SVG inherits Lessly tokens.
3. Commit BOTH the `.d2` source AND the rendered `.svg`. The source is the editable artifact; the SVG is what ships.
4. Reference from MDX:

   ```mdx
   <img src="/diagrams/<slug>.svg" alt="…" />
   ```

   (When build-time D2 compilation lands in a follow-up, MDX will support `<D2Diagram src="..." />` directly; for now, `<img>` is the contract.)

### Style overrides

D2's default theme isn't quite Lessly. Override at the file head:

```d2
vars: {
  d2-config: {
    theme-id: 200       # neutral palette closest to Lessly tokens
    sketch: false
    pad: 32
  }
}
```

## When to use which

| Page need | Use |
|---|---|
| Single canonical "this is how X works" diagram on an Explanation page | Figma hero |
| Sequence (request flow, build steps) | D2 |
| Quick branching flow inside a How-to | D2 |
| Single box-and-arrow inline in a paragraph | D2 |
| Anything you'd be embarrassed to show a customer if it's not designer-touched | Figma |

## What to avoid

- Don't embed PNG screenshots of whiteboard sketches.
- Don't use Mermaid unless D2 syntax would be genuinely worse (rare — usually sequence diagrams).
- Don't use emoji as diagram nodes.
- Don't hardcode colors in D2 files — use the `vars.d2-config` block and let the build script theme it.
- Don't ship a diagram in a PR without running `pnpm theme-diagrams` first — CI will fail visual regression on dark/light toggle.
