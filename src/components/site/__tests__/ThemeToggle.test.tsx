import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
  });

  test('toggles .light class on root', () => {
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(document.documentElement.classList.contains('light')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('persists choice to localStorage', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(localStorage.getItem('lessly-docs-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /theme/i }));
    expect(localStorage.getItem('lessly-docs-theme')).toBe('dark');
  });

  test('reads persisted theme on mount', () => {
    localStorage.setItem('lessly-docs-theme', 'light');
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
