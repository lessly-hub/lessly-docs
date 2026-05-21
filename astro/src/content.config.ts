import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    diataxis: z.enum(['tutorial', 'how-to', 'explanation', 'reference']),
    status: z.enum(['alpha', 'beta', 'stable']).optional(),
    updated: z.date().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { docs };
