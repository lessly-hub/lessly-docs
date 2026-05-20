import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiataxisBadge } from '../DiataxisBadge';

describe('DiataxisBadge', () => {
  test.each([
    ['tutorial',    'Tutorial'],
    ['how-to',      'How-to'],
    ['explanation', 'Explanation'],
    ['reference',   'Reference'],
  ] as const)('renders %s as %s', (type, label) => {
    render(<DiataxisBadge type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  test('badge uses uppercase styling (case-insensitive text match)', () => {
    const { container } = render(<DiataxisBadge type="tutorial" />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toMatch(/uppercase/);
  });
});
