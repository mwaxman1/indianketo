import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    author: z.string().default('Indian Keto Team'),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const roundups = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/roundups' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    products: z.array(z.object({
      name: z.string(),
      description: z.string(),
      price: z.string().optional(),
      rating: z.number().optional(),
      asin: z.string().optional(),
      pros: z.array(z.string()).default([]),
      cons: z.array(z.string()).default([]),
    })).default([]),
  }),
});

export const collections = { articles, roundups };
