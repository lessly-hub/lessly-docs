import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import './theme.css';
import { Inter } from 'next/font/google';
import { Header } from '@/components/site/Header';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.lessly.com'),
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Providers>
          <Header />
          <RootProvider>{children}</RootProvider>
        </Providers>
      </body>
    </html>
  );
}
