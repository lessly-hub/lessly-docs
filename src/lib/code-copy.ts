/**
 * Wire every `.lessly-code__copy` button on the page to copy its block's
 * source to the clipboard and flash a "Copied" label.
 *
 * Lives in `src/lib` (not in `CodeBlock.astro`) because fenced ``` blocks
 * are rendered as raw HTML by `src/lib/rehype/code.ts` — the Astro
 * component is never mounted on those pages, so its scoped `<script>`
 * block would never bundle. `Layout.astro` imports this so the wire-up
 * ships on every page that can hold code.
 *
 * The source text comes from the `data-source` attribute on the copy
 * button. We previously stored it inside a sibling `<template>` element,
 * but hast/mdast loses `<template>` content through the rehype round-trip
 * (it gets serialized empty), which silently broke the copy action.
 */
export function wireCopyButtons(): void {
  const blocks = document.querySelectorAll<HTMLElement>('.lessly-code');
  blocks.forEach((block) => {
    const button = block.querySelector<HTMLButtonElement>('.lessly-code__copy');
    if (!button || button.dataset.wired === '1') return;
    button.dataset.wired = '1';

    const copyIcon = block.querySelector<HTMLElement>('.lessly-code__icon-copy');
    const checkIcon = block.querySelector<HTMLElement>('.lessly-code__icon-check');
    const label = button.querySelector<HTMLElement>('.lessly-code__copy-label');
    const copiedLabel = button.dataset.copiedLabel ?? 'Copied';
    const copyLabel = button.dataset.copyLabel ?? 'Copy';
    const source = button.dataset.source ?? '';

    button.addEventListener('click', () => {
      // Optimistic UI: flip label + icons synchronously so the user sees
      // feedback in the same frame as the click, before the async clipboard
      // call resolves. lessly:ux audit rule 3.2: every action needs feedback inside ~100ms.
      if (label) label.textContent = copiedLabel;
      copyIcon?.classList.add('hidden');
      checkIcon?.classList.remove('hidden');

      void navigator.clipboard.writeText(source).catch(() => {
        /* clipboard unavailable — UX feedback already happened; nothing else to do */
      });

      window.setTimeout(() => {
        if (label) label.textContent = copyLabel;
        copyIcon?.classList.remove('hidden');
        checkIcon?.classList.add('hidden');
      }, 2000);
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireCopyButtons);
  } else {
    wireCopyButtons();
  }
  document.addEventListener('astro:page-load', wireCopyButtons);
}
