import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Callout } from '../Callout';

describe('Callout', () => {
  test.each([
    ['note', 'Note'],
    ['info', 'Info'],
    ['tip', 'Tip'],
    ['warning', 'Warning'],
    ['danger', 'Danger'],
  ] as const)('renders %s callout with label "%s"', (type, label) => {
    render(<Callout type={type}>body text</Callout>);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  test('renders an icon (not color-only — UX rule 6.1)', () => {
    const { container } = render(<Callout type="warning">x</Callout>);
    // lucide icons render as inline SVGs
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('defaults to "note" type when type omitted', () => {
    render(<Callout>plain body</Callout>);
    expect(screen.getByText('Note')).toBeInTheDocument();
  });
});
