import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'Gearboxes',
      'Gear Motors',
      'AC Motors',
      'Gears',
      'Sprockets',
      'Pulleys',
      'Transmission Shafts',
      'Sheet Metal Fabrication',
    ]),
    subcategory: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    excerpt: z.string(),
    features: z.array(z.string()).default([]),
    specs: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
    order: z.number().default(0),
    published: z.boolean().default(true),
    slug: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.enum(['Product Knowledge','Selection Guide','Technical Guide','Industry News','Company News']),
    excerpt: z.string(),
    image: z.string().optional(),
    published: z.boolean().default(true),
  }),
});

export const collections = { products, news };
