/**
 * Convert a Lucide icon node (an array of `[tag, attrs]` pairs) to a raw
 * SVG string for inlining in Astro components. Server-side only — never
 * shipped to the client at runtime.
 */
type LucideAttrs = Record<string, string | number>;
type LucideChild = readonly [string, LucideAttrs];
export type LucideIcon = ReadonlyArray<LucideChild>;

const DEFAULT_ATTRS: Record<string, string> = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

function attrsToString(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

export interface IconOptions {
  size?: number;
  class?: string;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
}

export function renderIcon(icon: LucideIcon, opts: IconOptions = {}): string {
  const attrs: Record<string, string | number> = { ...DEFAULT_ATTRS };
  if (opts.size != null) {
    attrs.width = String(opts.size);
    attrs.height = String(opts.size);
  }
  if (opts.strokeWidth != null) attrs['stroke-width'] = String(opts.strokeWidth);
  if (opts.class) attrs.class = opts.class;
  if (opts['aria-hidden'] !== false) attrs['aria-hidden'] = 'true';

  const children = icon
    .map(([tag, childAttrs]) => `<${tag} ${attrsToString(childAttrs)} />`)
    .join('');

  return `<svg ${attrsToString(attrs)}>${children}</svg>`;
}
