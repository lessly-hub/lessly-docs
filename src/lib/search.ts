/**
 * Lazy loader for the Pagefind headless API.
 *
 * Pagefind ships its index and runtime under `/pagefind/` after `pagefind --site dist/client`.
 * We avoid bundling it at build time (it isn't in `node_modules` at the right path) and
 * import it dynamically on the first ⌘K press. The instance is cached for subsequent calls.
 *
 * If the index hasn't been generated (e.g. `astro dev` without a prior `pnpm build:all`),
 * `loadPagefind()` returns `null` and the caller should render an instructional message.
 */
export interface PagefindSubResult {
  url: string;
  title: string;
  excerpt: string;
}

export interface PagefindResultData {
  url: string;
  meta: { title?: string; [k: string]: unknown };
  excerpt: string;
  sub_results?: PagefindSubResult[];
}

export interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

export interface PagefindSearchResponse {
  results: PagefindResult[];
}

export interface PagefindInstance {
  search: (query: string) => Promise<PagefindSearchResponse>;
  init?: () => Promise<void>;
}

let pagefindPromise: Promise<PagefindInstance | null> | null = null;

/**
 * Dynamically import `/pagefind/pagefind.js` from the same origin. Returns `null`
 * if the index isn't built yet so the UI can show a setup hint instead of crashing.
 */
export function loadPagefind(): Promise<PagefindInstance | null> {
  if (pagefindPromise) return pagefindPromise;

  pagefindPromise = (async () => {
    try {
      // Use a runtime-relative URL string so the bundler doesn't try to resolve it.
      const url = new URL('/pagefind/pagefind.js', window.location.origin).toString();
      const mod = (await import(/* @vite-ignore */ url)) as PagefindInstance;
      if (mod.init) {
        try {
          await mod.init();
        } catch {
          /* init is optional in some Pagefind versions */
        }
      }
      return mod;
    } catch (err) {
      // Most common failure: 404 because `pagefind --site dist/client` hasn't run.
      console.warn('[search] Pagefind not available:', err);
      return null;
    }
  })();

  return pagefindPromise;
}

/**
 * Run a Pagefind search. Returns an empty list if Pagefind isn't loaded.
 * Throws a sentinel `Error` with `name === 'PagefindUnavailable'` if the index is missing
 * so the UI can render a "build the index" message.
 */
export async function search(query: string): Promise<PagefindResultData[]> {
  const pf = await loadPagefind();
  if (!pf) {
    const err = new Error('Search index not built — run `pnpm build:all` first.');
    err.name = 'PagefindUnavailable';
    throw err;
  }
  const trimmed = query.trim();
  if (!trimmed) return [];
  const response = await pf.search(trimmed);
  // Resolve the top 10 result payloads in parallel.
  const top = response.results.slice(0, 10);
  return Promise.all(top.map((r) => r.data()));
}
