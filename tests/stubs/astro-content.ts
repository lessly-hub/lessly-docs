/**
 * Vitest stub for the virtual `astro:content` module.
 *
 * Astro injects `astro:content` at build time. Our unit suite never invokes
 * the loader — it only needs the type imports and a no-op `getCollection` to
 * satisfy the module graph.
 */
export type CollectionEntry<_T = unknown> = {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    draft?: boolean;
    status?: string;
  };
};

export async function getCollection<T = unknown>(_name: string): Promise<CollectionEntry<T>[]> {
  return [];
}
