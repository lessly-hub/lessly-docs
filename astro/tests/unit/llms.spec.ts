/**
 * Unit tests for `src/lib/llms.ts`.
 *
 * Covers the pure render helpers:
 *   - `renderPageAsMarkdown` strips MDX components (Tabs, Callout, OpenInClaude,
 *     etc.) and preserves fenced code blocks
 *   - `renderLlmsTxt` lists each entry once with the documented format
 */
import { describe, it, expect } from 'vitest';
import { renderPageAsMarkdown, renderLlmsTxt, type DocEntry } from '@/lib/llms';

// Helper: build a minimal DocEntry shape — only the fields the renderers touch.
function entry(
  id: string,
  title: string,
  description: string,
  body: string,
  status?: string,
): DocEntry {
  return {
    id,
    body,
    data: { title, description, ...(status ? { status } : {}) },
  } as unknown as DocEntry;
}

describe('renderPageAsMarkdown', () => {
  it('strips <Tabs>/<Tab> and surfaces tab labels as h3 sections', () => {
    const src = [
      'Intro line.',
      '',
      '<Tabs defaultTab="a">',
      '  <Tab value="a" label="Tab A">',
      '    Body A',
      '  </Tab>',
      '  <Tab value="b" label="Tab B">',
      '    Body B',
      '  </Tab>',
      '</Tabs>',
    ].join('\n');
    const out = renderPageAsMarkdown(entry('x.mdx', 'X', 'd', src));
    expect(out).not.toMatch(/<Tabs/);
    expect(out).not.toMatch(/<Tab\b/);
    expect(out).toMatch(/### Tab A/);
    expect(out).toMatch(/### Tab B/);
    expect(out).toMatch(/Body A/);
    expect(out).toMatch(/Body B/);
  });

  it('strips <Callout> and rewrites it as a blockquote', () => {
    const src = '<Callout variant="warning" title="Heads up">Be careful.</Callout>';
    const out = renderPageAsMarkdown(entry('x.mdx', 'X', 'd', src));
    expect(out).not.toMatch(/<Callout/);
    expect(out).toMatch(/> \*\*HEADS UP\*\*/);
    expect(out).toMatch(/> Be careful\./);
  });

  it('strips <OpenInClaude /> (both self-closing and block forms)', () => {
    const src1 = '<OpenInClaude toolName="lessly_deploy" exampleArgs={{}} />';
    const out1 = renderPageAsMarkdown(entry('x.mdx', 'X', 'd', src1));
    expect(out1).not.toMatch(/<OpenInClaude/);
    expect(out1).toMatch(/lessly_deploy/);

    const src2 = '<OpenInClaude toolName="x">label</OpenInClaude>';
    const out2 = renderPageAsMarkdown(entry('x.mdx', 'X', 'd', src2));
    expect(out2).not.toMatch(/<OpenInClaude/);
  });

  it('preserves fenced code blocks verbatim', () => {
    const src = [
      'Before.',
      '',
      '```bash',
      'claude mcp add lessly https://mcp.lessly.com',
      '```',
      '',
      'After.',
    ].join('\n');
    const out = renderPageAsMarkdown(entry('x.mdx', 'X', 'd', src));
    expect(out).toContain('```bash');
    expect(out).toContain('claude mcp add lessly https://mcp.lessly.com');
    expect(out).toContain('```');
  });
});

describe('renderLlmsTxt', () => {
  it('emits one line per entry in the documented format', () => {
    const entries: DocEntry[] = [
      entry('get-started/install.mdx', 'Install', 'How to install', ''),
      entry('reference/tools.mdx', 'Tools', 'The tools catalog', ''),
    ];
    const out = renderLlmsTxt(entries);
    const bodyLines = out
      .trim()
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('>'));
    expect(bodyLines).toEqual([
      'Install (/docs/get-started/install) — How to install',
      'Tools (/docs/reference/tools) — The tools catalog',
    ]);
  });

  it('lists each page exactly once', () => {
    const entries: DocEntry[] = [
      entry('a.mdx', 'A', 'one', ''),
      entry('b.mdx', 'B', 'two', ''),
      entry('c.mdx', 'C', 'three', ''),
    ];
    const out = renderLlmsTxt(entries);
    expect(out.match(/^A \(/gm)?.length).toBe(1);
    expect(out.match(/^B \(/gm)?.length).toBe(1);
    expect(out.match(/^C \(/gm)?.length).toBe(1);
  });
});
