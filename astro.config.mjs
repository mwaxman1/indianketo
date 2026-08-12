import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'static',
  site: 'https://indianketo.com',
  adapter: vercel(),
  trailingSlash: 'never',
  integrations: [
    mdx({
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, {
          behavior: 'append',
          properties: {
            className: ['anchor-link'],
            ariaLabel: 'Link to section',
          },
          content: {
            type: 'text',
            value: ''
          }
        }]
      ],
    }),
    sitemap({
      filter: (page) => {
        const excludePatterns = [
          '/admin/dashboard',
        ];
        return !excludePatterns.some(pattern =>
          page.endsWith(pattern) || page.endsWith(pattern + '/')
        );
      }
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      cors: true,
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5000
  },
  preview: {
    host: '0.0.0.0',
    port: 5000
  }
});
