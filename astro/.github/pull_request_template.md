<!--
PR template for changes under astro/ (the new docs site). The repo-root
template (../.github/pull_request_template.md) still applies to changes
elsewhere. GitHub picks the template closest to the changed paths.
-->

## Summary

<!-- One paragraph: what changes and why -->

## Diátaxis page type (for `astro/content/` changes)

<!-- Tick exactly one -->
- [ ] Tutorial — first-time success
- [ ] How-to — recipe for a known problem
- [ ] Explanation — mental model
- [ ] Reference — dry facts
- [ ] N/A — non-content change

## UX 5-check (per `lessly:ux`)

<!--
Tick each box once verified on the Cloudflare Pages preview URL.
G = green / passes; Y = needs a follow-up but mergeable; R = blocks merge.
-->

- [ ] **Happy-path:** the primary task in the changed surface completes end-to-end (G / Y / R: ____)
- [ ] **States:** loading, empty, error, success states are each handled — no silent dead branches (G / Y / R: ____)
- [ ] **Dead ends:** every page offers at least one clear next step (CTA, related link, or back-to-index) (G / Y / R: ____)
- [ ] **CTA clarity:** the primary action is unambiguous from the visible label alone (G / Y / R: ____)
- [ ] **Error copy:** error messages name what went wrong AND what the user can do next (G / Y / R: ____)

## Checklist

- [ ] [`AGENTS.md`](../AGENTS.md) rules followed (no banned vocabulary)
- [ ] Frontmatter present (`title:`, `description:`, `diataxis:`, `status:` if applicable)
- [ ] `pnpm test`, `pnpm check:links`, `pnpm test:e2e` pass locally
- [ ] Cloudflare Pages preview URL inspected

## Reviewer notes

<!-- Anything that needs DRI judgment -->
