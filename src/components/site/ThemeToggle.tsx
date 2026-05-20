'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const KEY = 'lessly-docs-theme';
type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Theme | null;
    if (stored === 'light') {
      document.documentElement.classList.add('light');
      setTheme('light');
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(KEY, next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
