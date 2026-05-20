import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // The outer <Header> already shows the Lessly lockup, so the
      // Fumadocs sidebar nav title is intentionally empty.
      title: <></>,
    },
  };
}
