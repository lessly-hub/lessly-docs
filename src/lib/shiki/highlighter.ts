/**
 * Shared Shiki highlighter for build-time tokenization.
 *
 * Sync variant: we statically import every grammar + theme we ship and
 * build a sync highlighter via `createHighlighterCoreSync`. Sync matters
 * because Astro's MDX `<Content components={...}>` map does not await
 * async components — making the `<CodeBlock>` Astro component async
 * caused MDX to silently drop the rest of the page.
 *
 * - Dual themes: `github-dark` (default) + `github-light` (under `.light`).
 * - Scoped bundled languages — anything not in the list falls back to `text`.
 *
 * The rehype plugin (`src/lib/rehype/code.ts`) uses the same module, so
 * both fenced-block tokenization and explicit `<CodeBlock>` go through
 * one code path.
 */
import { createHighlighterCoreSync, type HighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import {
  transformerNotationDiff,
  transformerNotationHighlight,
} from '@shikijs/transformers';

import langTs from '@shikijs/langs/ts';
import langTsx from '@shikijs/langs/tsx';
import langJs from '@shikijs/langs/js';
import langJsx from '@shikijs/langs/jsx';
import langJson from '@shikijs/langs/json';
import langBash from '@shikijs/langs/bash';
import langMd from '@shikijs/langs/md';
import langMdx from '@shikijs/langs/mdx';
import langAstro from '@shikijs/langs/astro';
import langHtml from '@shikijs/langs/html';
import langCss from '@shikijs/langs/css';

import themeGithubDark from '@shikijs/themes/github-dark';
import themeGithubLight from '@shikijs/themes/github-light';

/**
 * Languages the docs site can highlight. Authoring outside this list
 * gets a plain-text render — keeps the bundle scoped and predictable.
 */
export const BUNDLED_LANGUAGES = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'bash',
  'sh',
  'mdx',
  'md',
  'astro',
  'html',
  'css',
] as const;

export const BUNDLED_THEMES = {
  default: 'github-dark',
  light: 'github-light',
} as const;

const highlighter: HighlighterCore = createHighlighterCoreSync({
  themes: [themeGithubDark, themeGithubLight],
  langs: [
    langTs,
    langTsx,
    langJs,
    langJsx,
    langJson,
    langBash,
    langMd,
    langMdx,
    langAstro,
    langHtml,
    langCss,
  ],
  engine: createJavaScriptRegexEngine(),
});

export function resolveLang(lang?: string): string {
  if (!lang) return 'text';
  const normalised = lang.toLowerCase();
  if ((BUNDLED_LANGUAGES as readonly string[]).includes(normalised)) {
    // `sh` is an alias for `bash` in our bundle.
    if (normalised === 'sh') return 'bash';
    return normalised;
  }
  if (normalised === 'typescript') return 'ts';
  if (normalised === 'javascript') return 'js';
  if (normalised === 'shell' || normalised === 'zsh') return 'bash';
  return 'text';
}

/** Parse `"1,3-5"` into an explicit list of 1-based line numbers. */
export function parseHighlightLines(spec?: string): Set<number> {
  const out = new Set<number>();
  if (!spec) return out;
  for (const chunk of spec.split(',')) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
        out.add(i);
      }
    } else if (/^\d+$/.test(trimmed)) {
      out.add(Number(trimmed));
    }
  }
  return out;
}

export interface RenderOptions {
  code: string;
  lang?: string;
  variant?: 'default' | 'diff' | 'terminal';
  highlightLines?: string;
  showLineNumbers?: boolean;
}

export function renderCodeHtml(opts: RenderOptions): string {
  const lang = resolveLang(opts.lang);
  const highlighted = parseHighlightLines(opts.highlightLines);

  const transformers = [
    transformerNotationDiff({ matchAlgorithm: 'v3' }),
    transformerNotationHighlight({ matchAlgorithm: 'v3' }),
    {
      name: 'lessly:line-meta',
      line(node: any, line: number) {
        const classes = new Set(
          ((node.properties?.class as string | undefined) ?? '').split(/\s+/).filter(Boolean),
        );
        classes.add('code-line');
        if (highlighted.has(line)) classes.add('code-line--highlighted');
        node.properties = node.properties ?? {};
        node.properties.class = Array.from(classes).join(' ');
        node.properties['data-line'] = String(line);
      },
      pre(node: any) {
        node.properties = node.properties ?? {};
        const existing = ((node.properties.class as string | undefined) ?? '').split(/\s+/).filter(Boolean);
        existing.push('shiki-pre');
        if (opts.variant) existing.push(`shiki-pre--${opts.variant}`);
        if (opts.showLineNumbers) existing.push('shiki-pre--numbered');
        node.properties.class = Array.from(new Set(existing)).join(' ');
      },
    },
  ];

  return highlighter.codeToHtml(opts.code, {
    lang,
    themes: BUNDLED_THEMES,
    defaultColor: false,
    cssVariablePrefix: '--shiki-',
    transformers,
  });
}
