<!--
Issue template for lessly-docs. Customer-facing docs site, Astro 6 + first-party
docs engine. Read AGENTS.md for the load-bearing rules before filing.

Open an issue only when it's actionable today. If the work is blocked or the
scope is unclear, write it up in your own notes first, surface in #lessly-docs,
and file the issue when you can say what done looks like.
-->

## Summary

<!-- One paragraph: what's wrong / what's missing / what should change. -->

## Why this matters

<!-- Who's affected and how. A docs site bug that's invisible to readers gets
deprioritized; a bug that breaks a Get Started flow blocks adoption. Be honest
about which one this is. -->

## Definition of Done

User-behavioral criteria — what the reader can do, see, or experience after this is fixed:

- [ ] <!-- e.g. "Reader on docs.lessly.com sees the Lessly logo in the browser tab" -->
- [ ] <!-- e.g. "Reader can complete the Get Started → Install flow without hitting a 404" -->

Path coverage — both the human path and the agent path are documented (rule 5 in [`AGENTS.md`](../AGENTS.md#the-five-load-bearing-rules)):

- [ ] **UI path** documented for the new or changed capability
- [ ] **MCP path** documented — OR the page declares **"Agent-only"** with a one-line rationale
- [ ] Required **token scope / permission** named in the MCP section

Quality bar — the [Lessly gates](../AGENTS.md#pre-merge-gates) that must pass against the preview URL before this can close:

- [ ] **Visual conformance** — `/lessly:design audit <preview-url>` shows no token violations / hardcoded hex
- [ ] **UX walk** — `/lessly:ux walk <preview-url>` returns `clean`, or each Y/R has a follow-up issue linked
- [ ] **Runtime errors** — `/lessly:errors audit <preview-url>` clean (no new `$exception` events tied to the preview URL)

<!-- If this issue only touches non-content files (CONTRIBUTING.md, agents/,
.github/workflows/), strike through the gates that don't apply. -->

## Notes / links

<!-- Screenshots, related issues, related PRs, prior discussion. -->
