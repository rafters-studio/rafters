export interface ChartLegendClassSet {
  root: string;
  entry: string;
  label: string;
}

/**
 * Structural classes only. No decoration to reuse from an existing overlay
 * here (unlike chart-tooltip/tooltip.classes.ts): a legend is a plain,
 * always-visible row of swatch+label pairs, not a floating panel -- there is
 * no shipped component with that shape to borrow from. The swatch color is
 * the one channel that stays fill-only: `resolveSeriesClass` only ever
 * generates `fill-chart-N` (no `bg-chart-N` utility exists), so the swatch
 * renders as a small inline SVG shape, never a colored `<div>`.
 */
export function chartLegendClasses(): ChartLegendClassSet {
  return {
    root: 'flex flex-wrap items-center justify-center gap-4',
    entry:
      'flex items-center gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
    label: 'text-body-small text-muted-foreground',
  };
}

const SWATCH_WRAPPER_CLASS = 'h-2 w-2 shrink-0';

export function chartLegendSwatchWrapperClass(): string {
  return SWATCH_WRAPPER_CLASS;
}
