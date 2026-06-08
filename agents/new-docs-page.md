---
name: new-docs-page
description: Walk through creating a new page on docs.lessly.com — pick a Diátaxis type, fill the template, follow the cross-cutting rules.
---

# New docs page

Use this when adding any page to docs.lessly.com. Decide the Diátaxis type FIRST; the rest follows.

## Step 1 — Pick a type

Which sentence describes your page best?

| Sentence | Type | Frontmatter |
|---|---|---|
| "Walk the reader through their first success with X." | Tutorial | `diataxis: tutorial` |
| "Recipe to solve a specific problem." | How-to | `diataxis: how-to` |
| "Explain how X works so the reader builds a mental model." | Explanation | `diataxis: explanation` |
| "Dry facts the reader looks up." | Reference | `diataxis: reference` |

If two feel right, the page should probably be two pages. Split before writing.

## Step 2 — Create the file

Path: `content/docs/<area>/<slug>.mdx`. The slug becomes the URL segment.

Frontmatter:

```yaml
---
title: …                    # ≤ 5 words
description: …              # ≤ 80 chars, customer language
diataxis: tutorial | how-to | explanation | reference
status: stable | beta | preview    # omit for default (stable)
related:                    # other docs pages, by path
  - /deployment/build-system/
---
```

## Step 3 — Use the matching template

### Tutorial
```mdx
# Title

<DiataxisBadge type="tutorial" />

## Goal
What the reader will have done by the end. One sentence.

## Prerequisites
What they need before starting. 3–5 bullets.

## Steps
1. …
2. …
(≤ 10 numbered steps)

## You just did this
Recap of what now exists or works.

## Next steps
1–3 links to related How-to or Explanation pages.
```

### How-to

> **Transitional form.** The subheads below are sequential because the per-step `<Tabs>` component is not built yet. Migration to per-step Tabs (shared prose, action steps switch with a sticky UI/Agent toggle) is tracked in [#48](https://github.com/lessly-hub/lessly-docs/issues/48). Rule 5 (paths covered) holds either way.

```mdx
# Title

<DiataxisBadge type="how-to" />

## Problem
One sentence describing the situation this page solves.

## Through the UI
Numbered steps a human follows in `app.lessly.com`. One happy path.

## Through an agent
The same outcome via the Lessly MCP server installed in the customer's AI agent.
- Name the required **token scope / permission**.
- Tool name + minimal invocation. REST API or CLI listed as alternates only when material.

<!--
If the capability is agent-only, REPLACE the two sections above with a single
"Agent-only" callout that names the rationale (e.g. bulk operation, discovery
flow). See AGENTS.md rule 5.
-->

## Verify it works
One observable 30-second check. Show it for both paths if they differ.

## Variations
Optional. Common deviations from the happy path.
```

### Explanation
```mdx
# Title

<DiataxisBadge type="explanation" />

## Overview
≤ 80 words. The mental model in one paragraph.

## How it works
Diagram + 2–4 paragraphs. Sequence matters.

## Trade-offs
What it does NOT do. Caps and limits.

## Related
<RelatedLinks />
```

### Reference
```mdx
# Title

<DiataxisBadge type="reference" />

(one table OR one alphabetized list, minimal prose)
```

For capability references (tables of actions / operations), include paired columns or paired sections showing the **UI path** and the **MCP tool name**. Agent-only operations get an explicit "Agent-only" marker in that row. See AGENTS.md rule 5.

## Step 4 — Banned vocabulary check

Before pushing, grep your file for: `extension`, `Dev Console`, `manifest`, `synapse`, `gateway`, or any `*-extension` repo name. None of these belong in customer-facing content. CI will fail your PR if they slip through. (Note: `MCP` is **not** banned — it's the customer's install path and must be discussed plainly.)

## Step 5 — Visual

- Tutorial / How-to: at most one screenshot. Capture at 2× resolution. Dark theme by default.
- Explanation: one hero diagram per page (Figma SVG in `public/diagrams/<page-slug>.svg`) OR one inline D2 diagram. See `diagram-system.md`.
- Reference: no images.

## Step 6 — PR

Title format: `docs(<area>): <title>`. Example: `docs(deployment): explain the build system`. The PR template asks for the Diátaxis type — fill it in to render the area DRI's review checklist.
