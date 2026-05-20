import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import './theme.css';
import { Inter } from 'next/font/google';
import { Header } from '@/components/site/Header';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Header />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
