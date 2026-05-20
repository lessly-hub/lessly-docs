import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageStatus } from '../PageStatus';

describe('PageStatus', () => {
  test('renders nothing for stable', () => {
    const { container } = render(<PageStatus value="stable" />);
    expect(container.firstChild).toBeNull();
  });

  test('renders "Beta" pill for beta', () => {
    render(<PageStatus value="beta" />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  test('renders "Preview" pill for preview', () => {
    render(<PageStatus value="preview" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  test('preview pill uses warning tone (not brand)', () => {
    const { container } = render(<PageStatus value="preview" />);
    const span = container.querySelector('span');
    expect(span?.className).toMatch(/text-text-warning/);
  });

  test('beta pill uses brand tone', () => {
    const { container } = render(<PageStatus value="beta" />);
    const span = container.querySelector('span');
    expect(span?.className).toMatch(/text-text-brand/);
  });
});
