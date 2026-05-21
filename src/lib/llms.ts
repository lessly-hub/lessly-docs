/**
 * AI-surface single source of truth.
 *
 * One module powers every export the spec calls for (S5):
 *   - /llms.txt         — short index (renderLlmsTxt)
 *   - /llms-full.txt    — bulk concat (renderLlmsFullTxt)
 *   - /docs/<slug>.md   — plain markdown per page (renderPageAsMarkdown)
 *   - /docs/<slug>.mdx  — verbatim MDX (served by the .mdx.ts endpoint)
 *   - /sitemap.xml      — uses getPublishedDocs()
 *   - /og/<slug>.png    — uses getPublishedDocs()
 *
 * No drift: same Content Collection in, every AI/crawler artifact out.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE = 'https://docs.lessly.com';

export type DocEntry = CollectionEntry<'docs'>;

/** Slug without `.mdx` extension, e.g. `get-started/install`. */
export function entrySlug(entry: DocEntry): string {
  return entry.id.replace(/\.mdx?$/, '');
}

/** Public canonical path for the page, e.g. `/docs/get-started/install`. */
export function entryPath(entry: DocEntry): string {
  return `/docs/${entrySlug(entry)}`;
}

/**
 * All published docs entries, sorted alphabetically by path.
 *
 * "Published" = not `status: 'draft'` AND not under `_fixtures/`.
 * The schema doesn't define a `draft` literal status, but it carries a
 * `draft?: boolean` flag — both gates are checked defensively so future
 * additions to either surface keep working.
 */
export async function getPublishedDocs(): Promise<DocEntry[]> {
  const all = await getCollection('docs');
  const published = all.filter((entry) => {
    if (entry.id.startsWith('_fixtures/')) return false;
    // Schema variant: `draft: true` frontmatter flag.
    if ((entry.data as { draft?: boolean }).draft === true) return false;
    // Spec variant: `status: 'draft'` (status enum may grow).
    if ((entry.data as { status?: string }).status === 'draft') return false;
    return true;
  });
  return published.sort((a, b) => entrySlug(a).localeCompare(entrySlug(b)));
}

// ---------------------------------------------------------------------------
// MDX → markdown stripping
// ---------------------------------------------------------------------------

/**
 * Convert an MDX file body to plain markdown by collapsing each of our
 * custom components into a markdown-friendly shape.
 *
 * Strategy: regex-driven, deterministic. The MDX prose components we ship
 * are simple enough that we don't need a full MDX AST parse here — we just
 * walk known component shapes and rewrite them in place.
 *
 * Order matters: we handle nested-block components (Tabs, AgentTranscript)
 * before single-line ones so their inner content gets surfaced.
 */
export function renderPageAsMarkdown(entry: DocEntry): string {
  let body = entry.body ?? '';

  body = stripTabs(body);
  body = stripAgentTranscript(body);
  body = stripCallouts(body);
  body = stripCodeBlock(body);
  body = stripMcpToolCard(body);
  body = stripOpenInClaude(body);
  body = stripImports(body);

  // Trim runs of blank lines (>2 in a row) — JSX removal can leave artifacts.
  body = body.replace(/\n{3,}/g, '\n\n').trim();
  return body;
}

function stripImports(s: string): string {
  // Remove leading `import` lines (rare in our docs but keep clean).
  return s.replace(/^import[^\n]*\n/gm, '');
}

function stripCallouts(s: string): string {
  // <Callout variant="X" title="Y">...</Callout>
  return s.replace(
    /<Callout([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_match, attrs: string, inner: string) => {
      const variant = attrFrom(attrs, 'variant') ?? 'note';
      const title = attrFrom(attrs, 'title');
      const label = (title ?? variant).toUpperCase();
      const quoted = inner
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return `> **${label}**\n${quoted}`;
    },
  );
}

function stripCodeBlock(s: string): string {
  // Self-closing form: <CodeBlock lang="..." code="..." />
  s = s.replace(
    /<CodeBlock([^/>]*?)\/>/g,
    (_match, attrs: string) => {
      const lang = attrFrom(attrs, 'lang') ?? '';
      const code = attrFrom(attrs, 'code') ?? '';
      return ['```' + lang, code, '```'].join('\n');
    },
  );
  // Block form: <CodeBlock lang="...">…inner code…</CodeBlock>
  // (Used when code contains characters that don't survive a JSX attribute.)
  s = s.replace(
    /<CodeBlock([^>]*?)>([\s\S]*?)<\/CodeBlock>/g,
    (_match, attrs: string, inner: string) => {
      const lang = attrFrom(attrs, 'lang') ?? '';
      return ['```' + lang, inner.trim(), '```'].join('\n');
    },
  );
  return s;
}

function stripOpenInClaude(s: string): string {
  // <OpenInClaude toolName="X" exampleArgs="Y" /> or block form.
  return s
    .replace(/<OpenInClaude([^/>]*?)\/>/g, (_m, attrs: string) => {
      const tool = attrFrom(attrs, 'toolName') ?? '';
      return tool ? `_Open in Claude — calls \`${tool}\`._` : '_Open in Claude._';
    })
    .replace(/<OpenInClaude([\s\S]*?)<\/OpenInClaude>/g, '_Open in Claude._');
}

function stripMcpToolCard(s: string): string {
  // Literal object form: <McpToolCard tool={{ name: 'x', ... }} />
  s = s.replace(
    /<McpToolCard\s+tool=\{\{([\s\S]*?)\}\}\s*\/>/g,
    (_m, inner: string) => {
      const name = pluckObjectField(inner, 'name') ?? 'tool';
      const summary = pluckObjectField(inner, 'summary') ?? '';
      const description = pluckObjectField(inner, 'description') ?? '';
      const parts = [`### \`${name}\``];
      if (summary) parts.push(summary);
      if (description) parts.push(description);
      return parts.join('\n\n');
    },
  );
  // Fallback: any other <McpToolCard ... /> shape (e.g. helper-resolved
  // `tool={getMcpTool('lessly_deploy')}`). Render a neutral placeholder line
  // so raw JSX never leaks into /llms-full.txt or /docs/<slug>.md.
  s = s.replace(
    /<McpToolCard\b[^>]*\/>/g,
    '_MCP tool card._',
  );
  // Block form, defensive: <McpToolCard …>…</McpToolCard>
  s = s.replace(
    /<McpToolCard\b[\s\S]*?<\/McpToolCard>/g,
    '_MCP tool card._',
  );
  return s;
}

function stripTabs(s: string): string {
  // <Tabs ...>  <Tab value="x" label="Y">…</Tab>  </Tabs>
  return s.replace(/<Tabs[^>]*>([\s\S]*?)<\/Tabs>/g, (_match, inner: string) => {
    const tabPattern = /<Tab([^>]*)>([\s\S]*?)<\/Tab>/g;
    const sections: string[] = [];
    let tabMatch: RegExpExecArray | null;
    while ((tabMatch = tabPattern.exec(inner)) !== null) {
      const attrs = tabMatch[1];
      const tabBody = dedent(tabMatch[2]).trim();
      const label = attrFrom(attrs, 'label') ?? attrFrom(attrs, 'value') ?? 'Tab';
      sections.push(`### ${label}\n\n${tabBody}`);
    }
    return sections.join('\n\n');
  });
}

function stripAgentTranscript(s: string): string {
  // <AgentTranscript> <Turn role="user|tool|claude" tool="X">…</Turn> ... </AgentTranscript>
  return s.replace(
    /<AgentTranscript[^>]*>([\s\S]*?)<\/AgentTranscript>/g,
    (_match, inner: string) => {
      const turnPattern = /<Turn([^>]*)>([\s\S]*?)<\/Turn>/g;
      const turns: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = turnPattern.exec(inner)) !== null) {
        const attrs = m[1];
        const turnBody = dedent(m[2]).trim();
        const role = attrFrom(attrs, 'role') ?? 'turn';
        const tool = attrFrom(attrs, 'tool');
        const speaker = tool ? `${role} (\`${tool}\`)` : role;
        const quoted = turnBody
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n');
        turns.push(`> **${speaker}:**\n${quoted}`);
      }
      return turns.join('\n>\n');
    },
  );
}

// ---------------------------------------------------------------------------
// Small parsing helpers — not a full JSX parser, just enough for our shapes.
// ---------------------------------------------------------------------------

function attrFrom(attrs: string, name: string): string | undefined {
  // Match name="…" or name='…' (string attr).
  const stringMatch = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)')`).exec(attrs);
  if (stringMatch) return stringMatch[2] ?? stringMatch[3];

  // Match name={`…`} (template literal).
  const tmplMatch = new RegExp(`\\b${name}=\\{\`([\\s\\S]*?)\`\\}`).exec(attrs);
  if (tmplMatch) return tmplMatch[1];

  // Match name={"…"} or name={'…'} (expression with string).
  const exprStringMatch = new RegExp(
    `\\b${name}=\\{\\s*("([^"]*)"|'([^']*)')\\s*\\}`,
  ).exec(attrs);
  if (exprStringMatch) return exprStringMatch[2] ?? exprStringMatch[3];

  return undefined;
}

function pluckObjectField(objLiteral: string, key: string): string | undefined {
  // Looks like `{ name: 'X', summary: "Y", description: 'Z', ... }` after the
  // outer `{` was already stripped by the call site. Match `key: 'value'`.
  const m = new RegExp(`${key}:\\s*("([^"]*)"|'([^']*)')`).exec(objLiteral);
  return m ? (m[2] ?? m[3]) : undefined;
}

function dedent(s: string): string {
  const lines = s.split('\n');
  let min = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (indent < min) min = indent;
  }
  if (!isFinite(min) || min === 0) return s;
  return lines.map((line) => line.slice(min)).join('\n');
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

/**
 * Short index. One line per page, sorted alphabetically by path.
 * Format: `<title> (<path>) — <description>`.
 */
export function renderLlmsTxt(entries: DocEntry[]): string {
  const lines: string[] = [
    '# Lessly Docs',
    '',
    '> Documentation for Lessly — install, deploy, and run apps via the Lessly MCP.',
    '',
  ];
  for (const entry of entries) {
    const path = entryPath(entry);
    lines.push(`${entry.data.title} (${path}) — ${entry.data.description}`);
  }
  return lines.join('\n') + '\n';
}

/** Full concatenated body. Page boundaries are markdown horizontal rules. */
export function renderLlmsFullTxt(entries: DocEntry[]): string {
  const parts: string[] = [];
  for (const entry of entries) {
    const body = renderPageAsMarkdown(entry);
    const header = `# ${entry.data.title}\n\n_Path: ${entryPath(entry)}_\n\n${body}`;
    parts.push(header);
  }
  return parts.join('\n\n---\n\n') + '\n';
}
