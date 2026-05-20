---
name: review-docs-pr
description: Review checklist for a docs.lessly.com PR. Covers Diátaxis, brand, UX rules, and the banned-vocab boundary.
---

# Review a docs PR

Run through this checklist before approving any PR that touches `content/`.

## 1. Page type and frontmatter

- [ ] `diataxis:` frontmatter present and matches actual content shape.
- [ ] Title ≤ 5 words.
- [ ] `description:` is customer language (no "extension", no "Dev Console", no internal jargon).
- [ ] `status:` accurate (don't mark `preview` content `stable`).
- [ ] If Explanation page: `related:` array populated.

## 2. Content shape

- [ ] Page answers exactly one question (lessly:ux rule 2.1).
- [ ] Word count under template budget (≤ 1500 unless explicitly approved).
- [ ] Tutorial steps are numbered, ≤ 10, each is one action.
- [ ] How-to has a "Verify it works" section with a concrete check.
- [ ] Explanation has Overview ≤ 80 words.
- [ ] Reference is a table or alphabetized list, not prose.

## 3. Brand and visuals

- [ ] No hardcoded hex colors anywhere in MDX.
- [ ] Screenshots captured at 2× resolution, dark theme.
- [ ] Diagrams are SVG (not PNG raster).
- [ ] If Figma hero diagram: built via `pnpm theme-diagrams` so colors are token CSS vars.
- [ ] If D2 inline diagram: same theme processing applied.

## 4. UX rules (soft — flag, don't block)

- [ ] At most one primary CTA visible above the fold.
- [ ] Callouts use `<Callout type="…" />` — never raw colored boxes.
- [ ] Code blocks use `<CodeBlock>`, not raw markdown fences.
- [ ] External links open in new tab only if leaving lessly.com.

## 5. Vocabulary

- [ ] CI banned-vocab lint passing. If failing, ask the author to fix — don't override.
- [ ] No invented terms — if a new domain noun appears, check if it should be in `/concepts/glossary/`.

## 6. Performance

- [ ] Lighthouse CI score ≥ 90 on PR preview.
- [ ] CLS ≤ 0.05.
- [ ] Visual regression baseline updated intentionally (not by accident).

## 7. Cross-links

- [ ] All in-page links resolve in the PR preview.
- [ ] No bare `#123` GitHub refs in content (auto-link side effects — see lessly-hub conventions).

## After review

Leave one of:
- `LGTM` if every box checks.
- Specific comments tied to checklist items if not.
- For style nits: prefix with `nit:` so authors can ignore safely.
