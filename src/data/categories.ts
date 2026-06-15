// ============================================================
// Category hierarchy — matches ggn-gear.com structure
// ============================================================
export interface SubCategory {
  name: string;
  slug: string;
  icon?: string;
}
export interface Category {
  name: string;
  slug: string;
  icon: string;
  subcategories?: SubCategory[];
}

// Full category tree matching ggn-gear.com
export const categoryTree: Category[] = [
  {
    name: 'Gear',
    slug: 'gear',
    icon: '⚙️',
    subcategories: [
      { name: 'Spur Gear', slug: 'spur-gear', icon: '🔧' },
      { name: 'Helical Gear', slug: 'helical-gear', icon: '🔄' },
      { name: 'Bevel Gear', slug: 'bevel-gear', icon: '⚡' },
      { name: 'Spiral Bevel Gear', slug: 'spiral-bevel-gear', icon: '📐' },
      { name: 'Worm Gears', slug: 'worm-gears', icon: '🪱' },
      { name: 'Gear Shaft', slug: 'gear-shaft', icon: '📏' },
    ],
  },
  {
    name: 'Sprocket',
    slug: 'sprocket',
    icon: '🔗',
    subcategories: [
      { name: 'Simplex Sprocket', slug: 'simplex-sprocket' },
      { name: 'Duplex Sprocket', slug: 'duplex-sprocket' },
      { name: 'Triplex Sprocket', slug: 'triplex-sprocket' },
    ],
  },
  {
    name: 'Belt Pulley',
    slug: 'belt-pulley',
    icon: '🔄',
    subcategories: [
      { name: 'V-Belt Pulley', slug: 'v-belt-pulley' },
      { name: 'Timing Belt Pulley', slug: 'timing-belt-pulley' },
    ],
  },
  {
    name: 'Coupling',
    slug: 'coupling',
    icon: '🔩',
    subcategories: [
      { name: 'Jaw Coupling', slug: 'jaw-coupling' },
      { name: 'Gear Coupling', slug: 'gear-coupling' },
      { name: 'Chain Coupling', slug: 'chain-coupling' },
    ],
  },
  {
    name: 'Transmission Shaft',
    slug: 'transmission-shaft',
    icon: '📏',
  },
  {
    name: 'Lead Screw',
    slug: 'lead-screw',
    icon: '🔨',
  },
  {
    name: 'Customized Parts',
    slug: 'customized-parts',
    icon: '🖥️',
  },
  {
    name: 'Transmission Parts',
    slug: 'transmission-parts',
    icon: '🏭',
  },
  {
    name: 'Sheet Metal Components',
    slug: 'sheet-metal-components',
    icon: '🏗️',
  },
  {
    name: 'Gear Motor',
    slug: 'gear-motor',
    icon: '⚡',
    subcategories: [
      { name: 'AC Gear Motor', slug: 'ac-gear-motor' },
      { name: 'DC Gear Motor', slug: 'dc-gear-motor' },
      { name: 'Worm Gear Motor', slug: 'worm-gear-motor' },
    ],
  },
  {
    name: 'Gearbox',
    slug: 'gearbox',
    icon: '🪱',
    subcategories: [
      { name: 'Worm Gearbox', slug: 'worm-gearbox' },
      { name: 'Helical Gearbox', slug: 'helical-gearbox' },
      { name: 'Bevel Gearbox', slug: 'bevel-gearbox' },
      { name: 'Industrial Gearbox', slug: 'industrial-gearbox' },
      { name: 'Variator', slug: 'variator' },
    ],
  },
  {
    name: 'AC Motor',
    slug: 'ac-motor',
    icon: '🔌',
    subcategories: [
      { name: '3-Phase Motor', slug: '3-phase-motor' },
      { name: 'Single-Phase Motor', slug: 'single-phase-motor' },
    ],
  },
];

// All subcategory slugs for validation
export const allSubCategorySlugs = categoryTree
  .flatMap(c => c.subcategories || [])
  .map(sc => sc.slug);

// Flat list of all category names (for schema enum)
export const allCategoryNames = categoryTree.map(c => c.name);

// Get category by slug
export function getCategory(slug: string) {
  return categoryTree.find(c => c.slug === slug);
}

// Get subcategory by parent slug and child slug
export function getSubCategory(parentSlug: string, childSlug: string) {
  const cat = getCategory(parentSlug);
  return cat?.subcategories?.find(sc => sc.slug === childSlug);
}
