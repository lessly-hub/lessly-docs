<!--
PR template for lessly-docs. The site is Astro 6 with a first-party docs
engine; see AGENTS.md for the load-bearing rules.
-->

## Summary

<!-- One paragraph: what changes and why -->

## Diátaxis page type (for `content/` changes)

<!-- Tick exactly one -->
- [ ] Tutorial — first-time success
- [ ] How-to — recipe for a known problem
- [ ] Explanation — mental model
- [ ] Reference — dry facts
- [ ] N/A — non-content change

## UX walk 5-check (per `lessly:ux walk <preview-url>`)

<!--
Tick each box once verified on the Cloudflare Pages preview URL.
G = green / passes; Y = needs a follow-up but mergeable; R = blocks merge.
-->

- [ ] **Happy-path:** the primary task in the changed surface completes end-to-end (G / Y / R: ____)
- [ ] **States:** loading, empty, error, success states are each handled — no silent dead branches (G / Y / R: ____)
- [ ] **Dead ends:** every page offers at least one clear next step (CTA, related link, or back-to-index) (G / Y / R: ____)
- [ ] **CTA clarity:** the primary action is unambiguous from the visible label alone (G / Y / R: ____)
- [ ] **Error copy:** error messages name what went wrong AND what the user can do next (G / Y / R: ____)

## Lessly gates

<!-- Run each against the preview URL. See AGENTS.md → Pre-merge gates for what each one checks. -->

- [ ] **Visual conformance** — `/lessly:design audit <preview-url>` (no token violations, no hardcoded hex)
- [ ] **UX walk** — `/lessly:ux walk <preview-url>` (returns `clean`, or follow-up issue filed for any Y/R)
- [ ] **Runtime errors** — `/lessly:errors audit <preview-url>` (no new `$exception` events in PostHog tied to this URL; skill is planned, query PostHog directly until it lands)

## Human + agent path coverage (rule 5)

<!-- Per AGENTS.md rule 5: every how-to and reference page documents BOTH paths, or declares Agent-only. -->

- [ ] **Human path (UI)** section present (or N/A — explanation / tutorial page)
- [ ] **Agent path (MCP)** section present — OR an **"Agent-only"** callout with a one-line rationale
- [ ] Required **token scope / permission** named in the agent section

## Checklist

- [ ] [`AGENTS.md`](../AGENTS.md) rules followed (no banned vocabulary, parity preserved)
- [ ] Frontmatter present (`title:`, `description:`, `diataxis:`, `status:` if applicable)
- [ ] `pnpm test`, `pnpm check:links`, `pnpm test:e2e` pass locally
- [ ] Cloudflare Pages preview URL inspected

## Reviewer notes

<!-- Anything that needs DRI judgment -->
