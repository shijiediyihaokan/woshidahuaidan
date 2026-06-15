// ============================================================
// Category hierarchy — new site structure (8 categories)
// ============================================================
export interface SubCategory {
  name: string;
  slug: string;
}
export interface Category {
  name: string;
  slug: string;
  icon: string;
  subcategories: SubCategory[];
}

export const categoryTree: Category[] = [
  {
    name: 'Gearboxes',
    slug: 'gearboxes',
    icon: '⚙️',
    subcategories: [
      { name: 'Worm Gearboxes', slug: 'worm-gearboxes' },
      { name: 'Helical Gearboxes', slug: 'helical-gearboxes' },
      { name: 'Bevel Gearboxes', slug: 'bevel-gearboxes' },
      { name: 'Right Angle Gearboxes', slug: 'right-angle-gearboxes' },
      { name: 'Screw Jacks', slug: 'screw-jacks' },
      { name: 'Speed Variators', slug: 'speed-variators' },
      { name: 'Industrial Gearboxes', slug: 'industrial-gearboxes' },
    ],
  },
  {
    name: 'Gear Motors',
    slug: 'gear-motors',
    icon: '⚡',
    subcategories: [
      { name: 'AC Gear Motors', slug: 'ac-gear-motors' },
      { name: 'Worm Gear Motors', slug: 'worm-gear-motors' },
      { name: 'Helical Gear Motors', slug: 'helical-gear-motors' },
      { name: 'Bevel Gear Motors', slug: 'bevel-gear-motors' },
    ],
  },
  {
    name: 'AC Motors',
    slug: 'ac-motors',
    icon: '🔌',
    subcategories: [
      { name: 'Single Phase AC Motors', slug: 'single-phase-ac-motors' },
      { name: 'Three Phase AC Motors', slug: 'three-phase-ac-motors' },
    ],
  },
  {
    name: 'Gears',
    slug: 'gears',
    icon: '🔧',
    subcategories: [
      { name: 'Spur Gears', slug: 'spur-gears' },
      { name: 'Helical Gears', slug: 'helical-gears' },
      { name: 'Bevel Gears', slug: 'bevel-gears' },
      { name: 'Worm Gears', slug: 'worm-gears' },
      { name: 'Custom Gears', slug: 'custom-gears' },
    ],
  },
  {
    name: 'Sprockets',
    slug: 'sprockets',
    icon: '🔗',
    subcategories: [
      { name: 'Roller Chain Sprockets', slug: 'roller-chain-sprockets' },
      { name: 'Double Pitch Sprockets', slug: 'double-pitch-sprockets' },
      { name: 'Idler Sprockets', slug: 'idler-sprockets' },
      { name: 'Custom Sprockets', slug: 'custom-sprockets' },
    ],
  },
  {
    name: 'Pulleys',
    slug: 'pulleys',
    icon: '🔄',
    subcategories: [
      { name: 'Timing Pulleys', slug: 'timing-pulleys' },
      { name: 'V-Belt Pulleys', slug: 'v-belt-pulleys' },
      { name: 'Custom Pulleys', slug: 'custom-pulleys' },
    ],
  },
  {
    name: 'Transmission Shafts',
    slug: 'transmission-shafts',
    icon: '📏',
    subcategories: [
      { name: 'Gear Shafts', slug: 'gear-shafts' },
      { name: 'Spline Shafts', slug: 'spline-shafts' },
      { name: 'Linear Shafts', slug: 'linear-shafts' },
      { name: 'Custom Shafts', slug: 'custom-shafts' },
    ],
  },
  {
    name: 'Sheet Metal Fabrication',
    slug: 'sheet-metal-fabrication',
    icon: '🏗️',
    subcategories: [
      { name: 'Sheet Metal Enclosures', slug: 'sheet-metal-enclosures' },
      { name: 'Stamping Parts', slug: 'stamping-parts' },
      { name: 'Welding Parts', slug: 'welding-parts' },
      { name: 'Laser Cut Sheet Metal Parts', slug: 'laser-cut-sheet-metal-parts' },
      { name: 'Bent Sheet Metal Parts', slug: 'bent-sheet-metal-parts' },
      { name: 'Custom Metal Fabrication', slug: 'custom-metal-fabrication' },
    ],
  },
];

export const allCategoryNames = categoryTree.map(c => c.name);
export const allSubSlugs = categoryTree.flatMap(c => c.subcategories.map(sc => sc.slug));

export function getCategory(slug: string) {
  return categoryTree.find(c => c.slug === slug);
}

export function getSubCategory(parentSlug: string, childSlug: string) {
  const cat = categoryTree.find(c => c.slug === parentSlug);
  return cat?.subcategories?.find(sc => sc.slug === childSlug);
}
