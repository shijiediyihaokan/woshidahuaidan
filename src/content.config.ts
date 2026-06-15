import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'Gear',
      'Sprocket',
      'Belt Pulley',
      'Coupling',
      'Transmission Shaft',
      'Lead Screw',
      'Customized Parts',
      'Transmission Parts',
      'Sheet Metal Components',
      'Gear Motor',
      'Gearbox',
      'AC Motor',
    ]),
    subcategory: z.string().optional(),
    image: z.string().optional(),
    excerpt: z.string(),
    features: z.array(z.string()).default([]),
    specs: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
    order: z.number().default(0),
    published: z.boolean().default(true),
  }),
});

export const collections = { products };
