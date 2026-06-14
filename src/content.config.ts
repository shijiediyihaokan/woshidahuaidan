import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    category: z.enum([
      'Gears & Racks',
      'Spur Gear',
      'Helical Gear',
      'Sprockets & Chains',
      'Spiral Bevel Gear',
      'Bevel Gear',
      'Worm Gears',
      'Couplings',
      'Gear Shaft',
      'Lead Screw',
      'Custom CNC Parts',
      'Sheet Metal Parts',
    ]),
    image: z.string().optional(),
    excerpt: z.string(),
    features: z.array(z.string()).default([]),
    specs: z
      .array(
        z.object({
          name: z.string(),
          value: z.string(),
        })
      )
      .default([]),
    order: z.number().default(0),
    published: z.boolean().default(true),
  }),
});

export const collections = { products };
