import { tooltipContentSurfaceClasses } from '../tooltip/tooltip.classes';
import type { IndicatorVariant } from './chart-tooltip.behavior';

export interface ChartTooltipClassSet {
  root: string;
  content: string;
  header: string;
  row: string;
  label: string;
  value: string;
}

/**
 * Reuses tooltip's content-panel decoration verbatim (`tooltipContentSurfaceClasses`
 * -- see tooltip.classes.ts) rather than authoring a second overlay surface,
 * per this issue's own design authority ("compose, never rewrite a
 * primitive") extended here to the shipped tooltip component itself:
 * chart-tooltip is a different TRIGGER model (pointer-driven hit-testing
 * over a plot, not one anchored trigger) but the same panel design decision.
 * That string already carries the border/background/shadow AND the motion
 * (`data-[state=open]:opacity-100 duration-moderate ease-enter`, base
 * `duration-fast ease-exit`) -- opacity-only, exactly what docs/MOTION.md
 * requires for a hint/tip surface. Its embedded `:hover`/`[data-tooltip]`
 * reveal selectors are inert here (chart-tooltip's DOM has neither marker),
 * so only the `data-[state=...]` rules this component actually sets apply.
 *
 * Chart-tooltip's own motion.jsonl rows (`chart-tooltip / content /
 * closed -> open` and `.../open -> closed`) declare the SAME tier/curve as
 * tooltip's (moderate/enter, fast/exit) rather than a `follows` reference,
 * because tooltip's own row is `fade + zoom` (a recorded matrix defect
 * against the opacity-only doctrine tooltip.classes.ts actually implements)
 * -- the class string is reused, the row is not. See the PR body.
 *
 * No color beyond the semantic `card`/`muted`/`foreground`/`background`
 * surface tokens tooltip already uses (Boundary 00 sec 6 scopes the
 * fill-only-never-background rule to the categorical `chart-N` channel
 * specifically -- confirmed against button.classes.ts's own `bg-primary`
 * usage). The per-series swatch color is the one channel that MUST stay
 * fill/stroke: `resolveSeriesClass` (chart.classes.ts) only ever generates
 * `fill-chart-N`/`stroke-chart-N` -- there is no `bg-chart-N` utility for
 * the token generator to emit -- so the swatch renders as a small inline SVG
 * shape in chart-tooltip.tsx, never a colored `<div>`. This part IS
 * chart-specific decoration, layered on top of the reused panel.
 */
export function chartTooltipClasses(): ChartTooltipClassSet {
  return {
    root: '',
    content: tooltipContentSurfaceClasses,
    header: 'mb-1 font-medium text-background',
    row: 'flex items-center gap-1.5',
    label: 'text-background/70',
    value: 'ml-auto font-mono font-medium tabular-nums text-background',
  };
}

/** Literal size/shape class for the swatch's `<svg>` wrapper, selected among
 *  the three indicator variants -- never constructed. Color is layered on
 *  separately via the per-row `swatchClass` (`fill-chart-N`). */
const INDICATOR_WRAPPER_CLASS: Record<IndicatorVariant, string> = {
  dot: 'h-2.5 w-2.5 shrink-0',
  line: 'h-3.5 w-1 shrink-0',
  dashed: 'h-1.5 w-3.5 shrink-0',
};

export function chartTooltipIndicatorWrapperClass(variant: IndicatorVariant): string {
  return INDICATOR_WRAPPER_CLASS[variant];
}
