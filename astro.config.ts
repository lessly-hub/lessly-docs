import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import rehypeCodeBlock from './src/lib/rehype/code';

// https://astro.build/config
export default defineConfig({
  site: 'https://docs.lessly.com',
  output: 'static',
  // Pin an explicit session driver so @astrojs/cloudflare does NOT auto-inject
  // a KV `SESSION` binding without an id (which blocks first deploy in CI's
  // non-interactive shell). Docs are stateless; in-memory is correct.
  session: { driver: sessionDrivers.lruCache() },
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [
    mdx({
      // Disable Astro/Shiki's default tokenization for fenced blocks — our
      // rehype plugin lifts them into <CodeBlock>, which runs Shiki itself
      // via the shared highlighter in `@/lib/shiki/highlighter`.
      syntaxHighlight: false,
      rehypePlugins: [rehypeCodeBlock],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    // Same as MDX: skip the built-in Shiki pass; `<CodeBlock>` owns it.
    syntaxHighlight: false,
  },
});
