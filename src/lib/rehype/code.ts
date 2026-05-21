/**
 * Rehype plugin: tokenize ``` fenced code blocks with the shared Shiki
 * highlighter and wrap them in the same chrome that the explicit
 * `<CodeBlock>` Astro component produces (filename pill + language pill +
 * copy button container).
 *
 * Why not transform to `<CodeBlock>` JSX? The MDX runtime resolves JSX
 * via `_components.<Name>` only when the identifier is in scope (either
 * imported or passed via `<Content components={...}>`). Synthetic
 * `mdxJsxFlowElement` nodes inserted by a rehype plugin do not see that
 * scope reliably, and silently render to nothing in some MDX paths.
 *
 * Inline code (`like this`) is left untouched. Explicit `<CodeBlock />`
 * authored in MDX uses the Astro component, which calls the same
 * highlighter — so both paths produce identical markup.
 */
import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';
import type { Root, Element, Text, Parent, Node, ElementContent } from 'hast';

import { renderCodeHtml } from '../shiki/highlighter';

function isElement(node: unknown): node is Element {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { type?: string }).type === 'element'
  );
}

function getLang(codeEl: Element): string | undefined {
  const className = codeEl.properties?.className;
  const classes = Array.isArray(className) ? className : className ? [className] : [];
  for (const c of classes) {
    if (typeof c === 'string' && c.startsWith('language-')) {
      return c.slice('language-'.length);
    }
  }
  return undefined;
}

function extractText(node: Element): string {
  let out = '';
  for (const child of node.children) {
    if ((child as Text).type === 'text') {
      out += (child as Text).value;
    } else if ((child as Element).type === 'element') {
      out += extractText(child as Element);
    }
  }
  return out;
}

interface CodeJob {
  parent: Parent;
  index: number;
  code: string;
  lang: string;
}

export function rehypeCodeBlock() {
  return (tree: Root) => {
    const jobs: CodeJob[] = [];

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index == null) return;
      const codeEl = node.children.find(
        (c: ElementContent) => isElement(c) && c.tagName === 'code',
      ) as Element | undefined;
      if (!codeEl) return;
      // Skip if this <pre> was already produced by our wrapper (idempotent).
      const className = node.properties?.className;
      const classList = Array.isArray(className) ? className : className ? [className] : [];
      if (classList.some((c) => typeof c === 'string' && c.includes('shiki-pre'))) return;

      jobs.push({
        parent: parent as Parent,
        index,
        code: extractText(codeEl).replace(/\n$/, ''),
        lang: getLang(codeEl) ?? 'text',
      });
    });

    for (const job of jobs) {
      const tokenized = renderCodeHtml({
        code: job.code,
        lang: job.lang,
        variant: 'default',
      });
      const langPill =
        job.lang && job.lang !== 'text'
          ? `<span class="rounded-sm bg-[var(--color-bg-surface)] px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wide text-[var(--color-text-tertiary)]">${job.lang}</span>`
          : '';
      const header = `<header class="flex h-9 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] px-3 text-xs text-[var(--color-text-tertiary)]"><div class="flex min-w-0 items-center gap-2">${langPill}</div><button type="button" class="lessly-code__copy flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-bright)]" data-copy-label="Copy" data-copied-label="Copied" aria-label="Copy code to clipboard"><span class="lessly-code__copy-label">Copy</span></button></header>`;
      const sourceTpl = `<template class="lessly-code__source">${escapeForTemplate(job.code)}</template>`;
      const wrappedHtml = `<figure class="lessly-code lessly-code--default group relative my-6 overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">${header}<div class="lessly-code__scroll overflow-x-auto">${tokenized}</div>${sourceTpl}</figure>`;

      const parsed = fromHtml(wrappedHtml, { fragment: true });
      const figure = parsed.children[0] as Node;
      (job.parent.children as unknown[]).splice(job.index, 1, figure as unknown);
    }
  };
}

function escapeForTemplate(s: string): string {
  // The <template> element holds inert content — text inside is treated
  // as raw HTML. We only need to escape the markup-significant chars.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default rehypeCodeBlock;
