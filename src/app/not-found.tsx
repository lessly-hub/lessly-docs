import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="mb-4 text-4xl font-bold text-text-primary">Page not found</h1>
      <p className="mb-8 text-text-secondary">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-bg-brand-bright px-4 py-2 font-semibold text-text-on-brand transition-colors hover:bg-bg-brand-bright-hover"
        >
          Back to home
        </Link>
        <div className="text-sm text-text-tertiary">Or try one of these:</div>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href="/get-started" className="text-text-link hover:text-text-link-hover">
              Get started
            </Link>
          </li>
          <li>
            <Link href="/deployment" className="text-text-link hover:text-text-link-hover">
              Deployment overview
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
