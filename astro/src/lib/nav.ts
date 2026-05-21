/**
 * Sidebar navigation tree.
 *
 * S1: hardcoded one-entry stub. The real file-tree derivation lands in S3
 * (walks `content/docs/**` plus optional `_order.json` per section).
 */

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export type NavTree = NavSection[];

export function getNavTree(): NavTree {
  return [
    {
      section: 'Get Started',
      items: [{ title: 'Install', href: '/docs/get-started/install' }],
    },
  ];
}
