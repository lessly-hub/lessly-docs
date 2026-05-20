'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

// Initialize once on the client, only if a key was provided at build time.
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // we fire docs.page.viewed manually
    persistence: 'localStorage',
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  useEffect(() => {
    if (!POSTHOG_KEY) return; // no-op when PostHog isn't initialized
    // `diataxis` is the page-type frontmatter value; the Provider can't read
    // page frontmatter from the layout, so we emit null here. Page-level
    // captures can enrich the property if/when needed.
    posthog.capture('docs.page.viewed', { path, diataxis: null });
  }, [path]);

  if (!POSTHOG_KEY) {
    // No PostHog → no Provider wrapper (avoids errors and the beacon).
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
