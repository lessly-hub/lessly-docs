import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Providers } from '../providers';

vi.mock('next/navigation', () => ({ usePathname: () => '/test' }));

describe('Providers (no PostHog key)', () => {
  test('renders children passthrough when NEXT_PUBLIC_POSTHOG_KEY is absent', () => {
    // In this test environment, the env var is unset
    const { getByText } = render(
      <Providers>
        <div>marker</div>
      </Providers>,
    );
    expect(getByText('marker')).toBeInTheDocument();
  });
});
