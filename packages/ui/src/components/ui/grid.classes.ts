/**
 * Shared class definitions for Grid component
 * Used by both grid.tsx (React) and grid.astro (Astro)
 */

export type GridPreset = 'linear' | 'golden' | 'bento';
export type BentoPattern = 'editorial' | 'dashboard' | 'feature' | 'portfolio';

export const gridGapClasses: Record<string, string> = {
  '0': 'gap-0',
  '1': 'gap-1',
  '2': 'gap-2',
  '3': 'gap-3',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
  '8': 'gap-8',
  '10': 'gap-10',
  '12': 'gap-12',
};

export const gridColumnClasses: Record<string | number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  auto: 'grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4',
};

export const gridBentoPatterns: Record<BentoPattern, string> = {
  editorial: 'grid-cols-3 grid-rows-2 [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2',
  dashboard: 'grid-cols-4 grid-rows-2 [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2',
  feature: 'grid-cols-2 [&>*:first-child]:row-span-2',
  portfolio: 'grid-cols-3 grid-rows-3 [&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2',
};

export const gridGoldenClasses = 'grid-cols-3 [&>*:first-child]:col-span-2';

export const gridColSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

export const gridRowSpanClasses: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};
