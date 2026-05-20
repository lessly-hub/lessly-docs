import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-14 bg-bg-primary border-b border-border-subtle">
      <div className="mx-auto max-w-[1440px] h-full px-6 lg:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          {/* Theme-aware logo: dark-default uses on-dark variant; .light overrides */}
          <img
            src="/logo/lessly-lockup-h-on-dark.svg"
            alt="Lessly"
            className="h-7 light:hidden"
          />
          <img
            src="/logo/lessly-lockup-h-on-light.svg"
            alt="Lessly"
            className="h-7 hidden light:block"
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
