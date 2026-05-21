/**
 * MDX component barrel.
 *
 * Wired globally in `src/pages/docs/[...slug].astro` via Astro's
 * `<Content components={...}>` map, so MDX authors can use
 * `<Callout>`, `<Tabs>`, `<Tab>`, `<OpenInClaude>`, and `<CodeBlock>`
 * directly without any per-file import boilerplate.
 *
 * Fenced ``` blocks are converted into `<CodeBlock>` by the rehype
 * plugin in `@/lib/rehype/code` — authors only reach for the explicit
 * `<CodeBlock>` form when they need a filename, language pill override,
 * line highlights, line numbers, or a non-default variant.
 *
 * Per-page imports still work for non-docs MDX (Astro will treat them
 * as standard ESM):
 *
 *   import { Callout, CodeBlock } from '@/components/mdx';
 */
export { default as Callout } from './Callout.astro';
export { default as CodeBlock } from './CodeBlock.astro';
export { default as Tabs } from './Tabs.astro';
export { default as Tab } from './Tab.astro';
export { default as OpenInClaude } from './OpenInClaude.astro';
