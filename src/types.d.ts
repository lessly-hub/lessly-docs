// Ambient type stubs for module shapes that don't ship declarations.

/**
 * Lucide ships per-icon ESM files at `lucide/dist/esm/icons/<name>.mjs` but
 * does not ship per-icon `.d.ts`. Every icon module's default export is the
 * `LucideIcon` payload shape `[tag, attrs][]` — typed structurally to match
 * what `src/lib/icon.ts:renderIcon` accepts.
 */
declare module 'lucide/dist/esm/icons/*.mjs' {
  type LucideIconNode = [string, Record<string, string | number>];
  const icon: LucideIconNode[];
  export default icon;
}
