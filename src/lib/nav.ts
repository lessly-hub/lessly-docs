/**
 * Sidebar navigation tree (Slice 3).
 *
 * Derives the sidebar from the `docs` Content Collection plus two control files:
 *   - `content/docs/_groups.json`            → group order + labels
 *   - `content/docs/<group>/_order.json`     → item order within a group (optional)
 *
 * Conflict rules (per spec §Architecture step 5, CI-linted):
 *   - If `_order.json` exists in a group, every `.mdx` file in that group MUST appear
 *     in it. Missing files throw at build with the offending filename.
 *   - Every entry in `_order.json` MUST resolve to a real file. Unknown entries
 *     throw at build with the offending entry.
 *   - If `_order.json` does not exist, items are ordered alphabetically by filename.
 *
 * Folders prefixed with `_` (e.g. `_fixtures/`) are excluded from the nav.
 *
 * ID-to-group mapping (Astro Content Collection quirks):
 *   - `<group>/<page>.mdx`  → id `<group>/<page>`              → group `<group>`
 *   - `<group>/index.mdx`   → id `<group>`  (Astro strips `index`) → group `<group>`,
 *                                                                    filename `index`
 *
 * Implementation note: control files come via `import.meta.glob` (eager, `import: 'default'`)
 * instead of `node:fs`. That keeps the module pure ESM so it works inside the Cloudflare
 * prerender worker (miniflare), where `node:fs` and `fileURLToPath(import.meta.url)` are
 * not available.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { parseMcpTools } from './mcp-tools';

export interface NavItem {
  title: string;
  href: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface GroupsConfig {
  order: string[];
  labels: Record<string, string>;
}

/**
 * The group id for a docs pathname, or `''` when the path is not under
 * `/docs/<group>`. Pure string logic shared by the header tabs, the desktop
 * sidebar, and the mobile drawer so "active section" is computed identically
 * everywhere. A trailing slash is ignored (Astro emits `/docs/<slug>/`).
 *
 *   `/docs/guides/webhooks` → `guides`
 *   `/docs/guides`          → `guides`
 *   `/docs` | `/`           → `''`
 */
export function activeGroupId(path: string): string {
  const match = path.replace(/\/$/, '').match(/^\/docs\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * The landing URL for a section: the group's index page (`/docs/<id>`) when it
 * exists, otherwise the first item. Returns `''` for an empty group.
 */
export function sectionHref(group: NavGroup): string {
  const landing = `/docs/${group.id}`;
  const index = group.items.find((item) => item.href === landing);
  return index?.href ?? group.items[0]?.href ?? '';
}

// Eager-glob every JSON under content/docs/.
const jsonModules = import.meta.glob<unknown>('/content/docs/**/*.json', {
  eager: true,
  import: 'default',
});

function pickJson(suffix: string): unknown | undefined {
  for (const [key, value] of Object.entries(jsonModules)) {
    if (key.endsWith(suffix)) return value;
  }
  return undefined;
}

function loadGroupsConfig(): GroupsConfig {
  const raw = pickJson('/content/docs/_groups.json');
  if (!raw) {
    throw new Error('[nav] Missing content/docs/_groups.json');
  }
  const parsed = raw as Partial<GroupsConfig>;
  if (!Array.isArray(parsed.order) || typeof parsed.labels !== 'object' || !parsed.labels) {
    throw new Error(
      '[nav] Invalid _groups.json: expected { order: string[], labels: Record<string,string> }',
    );
  }
  return parsed as GroupsConfig;
}

function loadOrderFile(groupId: string): string[] | null {
  const raw = pickJson(`/content/docs/${groupId}/_order.json`);
  if (!raw) return null;
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === 'string')) {
    throw new Error(
      `[nav] Invalid _order.json in group "${groupId}": expected string[] of filenames (without .mdx).`,
    );
  }
  return raw as string[];
}

interface Located {
  entry: CollectionEntry<'docs'>;
  groupId: string;
  filename: string; // 'index' for a group landing page
}

function locate(entry: CollectionEntry<'docs'>, knownGroupIds: Set<string>): Located | null {
  const id = entry.id.replace(/\.mdx?$/, '');
  // Group landing page: `<group>/index.mdx` → id `<group>`.
  if (!id.includes('/')) {
    if (knownGroupIds.has(id)) {
      return { entry, groupId: id, filename: 'index' };
    }
    return null;
  }
  const parts = id.split('/');
  const groupId = parts[0];
  const filename = parts[parts.length - 1];
  return { entry, groupId, filename };
}

function entryHref(entry: CollectionEntry<'docs'>): string {
  const slug = entry.id.replace(/\.mdx?$/, '').replace(/\/index$/, '');
  return `/docs/${slug}`;
}

/**
 * Pure ordering logic for a single group — extracted so it can be unit-tested
 * without an Astro runtime. Given the filenames present in the group and an
 * optional `_order.json` array, returns the ordered filenames or throws with
 * a developer-readable error matching the rules in the module-level docblock.
 *
 *   - If `order` is supplied:
 *       * every file in `filenamesPresent` MUST appear in `order` (Rule 1)
 *       * every entry in `order` MUST be present in `filenamesPresent` (Rule 2)
 *       * an empty `order` array still triggers Rule 1 (the first missing
 *         file is reported)
 *   - If `order` is null, sort alphabetically with `index` pinned first.
 */
export function orderGroupFilenames(
  groupId: string,
  filenamesPresent: Iterable<string>,
  order: string[] | null,
): string[] {
  const present = new Set(filenamesPresent);
  if (order) {
    // Rule 2 first: surface unknown entries before complaining about missing ones.
    for (const name of order) {
      if (!present.has(name)) {
        throw new Error(
          `[nav] _order.json in "${groupId}" references "${name}" but content/docs/${groupId}/${name}.mdx does not exist.`,
        );
      }
    }
    const orderSet = new Set(order);
    for (const name of present) {
      if (!orderSet.has(name)) {
        throw new Error(
          `[nav] content/docs/${groupId}/${name}.mdx exists but is missing from content/docs/${groupId}/_order.json. Add "${name}" to the order array.`,
        );
      }
    }
    return [...order];
  }
  return [...present].sort((a, b) => {
    if (a === 'index') return -1;
    if (b === 'index') return 1;
    return a.localeCompare(b);
  });
}

export async function getNav(): Promise<NavGroup[]> {
  const groupsConfig = loadGroupsConfig();
  const knownGroupIds = new Set(groupsConfig.order);
  const entries = await getCollection('docs');

  const byGroup = new Map<string, Located[]>();
  for (const entry of entries) {
    if (entry.data.draft) continue;
    const loc = locate(entry, knownGroupIds);
    if (!loc) continue;
    if (loc.groupId.startsWith('_')) continue;
    const bucket = byGroup.get(loc.groupId) ?? [];
    bucket.push(loc);
    byGroup.set(loc.groupId, bucket);
  }

  const groups: NavGroup[] = [];
  for (const groupId of groupsConfig.order) {
    const label = groupsConfig.labels[groupId];
    if (!label) {
      throw new Error(`[nav] _groups.json: missing label for group "${groupId}".`);
    }
    const bucket = byGroup.get(groupId);
    if (!bucket || bucket.length === 0) continue;

    const filenamesPresent = bucket.map((l) => l.filename);
    const order = loadOrderFile(groupId);
    const orderedNames = orderGroupFilenames(groupId, filenamesPresent, order);
    const byName = new Map(bucket.map((l) => [l.filename, l] as const));
    const ordered: Located[] = orderedNames.map((name) => byName.get(name)!);

    const items: NavItem[] = ordered.map(({ entry }) => ({
      title: entry.data.title,
      href: entryHref(entry),
    }));

    // Slice 4: the MCP tools catalog is data-driven from
    // `content/mcp-tools.json`, not a per-tool `.mdx` file. Inject each
    // tool as a sidebar item directly after the `tools` index page so
    // readers see the whole catalog in the Reference section. Pages live
    // at `/docs/reference/tools/<name>` (see `src/pages/docs/reference/tools/[name].astro`).
    if (groupId === 'reference') {
      const toolsIdx = items.findIndex((i) => i.href === '/docs/reference/tools');
      if (toolsIdx >= 0) {
        const toolItems: NavItem[] = parseMcpTools().tools.map((tool) => ({
          title: tool.name,
          href: `/docs/reference/tools/${tool.name}`,
        }));
        items.splice(toolsIdx + 1, 0, ...toolItems);
      }
    }

    groups.push({ id: groupId, label, items });
  }

  return groups;
}
