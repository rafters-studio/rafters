/**
 * ChartLegend -- one entry per configured series, display-only (#2228)
 *
 * @cognitive-load 1/10 - No decisions: renders one swatch+label per series in
 * config order.
 * @attention-economics Always visible while its chart is visible; a fixed,
 * low-attention reference the eye returns to, never something that competes
 * for attention on its own.
 * @trust-building The swatch color always traces to the SAME `ChartConfig`
 * the tooltip and marks read -- a legend entry can never disagree with the
 * chart about what a color means.
 * @accessibility `role="list"`/`role="listitem"` with `roving-focus` keyboard
 * traversal across entries; focus is visible. Default is DISPLAY-ONLY: no
 * action dispatches on activation (shadcn parity). Series-visibility toggling
 * is a future, explicit opt-in (`ChartLegendInteractive` or a prop), never
 * this component's default -- out of scope per the issue's own "What NOT to
 * Include."
 * @semantic-meaning Ports shadcn's `<ChartLegend content={<ChartLegendContent />} />`
 * call site verbatim -- no divergence: legend needs no per-pointer data, so
 * `ChartLegendContent` reads `useChartConfig()` directly with no injected props.
 *
 * @usage-patterns
 * DO: Render inside a `ChartContainer` so `useChartConfig()` resolves
 * NEVER: Add a click handler that hides a series -- see the accessibility note
 *
 * @example
 * ```tsx
 * <ChartContainer config={config}>
 *   <ChartLegend content={<ChartLegendContent />} />
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import { createRovingFocus } from '../../primitives/roving-focus';
import classy from '../../primitives/classy';
import { useChartConfig } from './chart';
import { chartLegend, legendEntries, type ChartLegendContentConfig } from './chart-legend.behavior';
import { chartLegendClasses, chartLegendSwatchWrapperClass } from './chart-legend.classes';

export interface ChartLegendProps {
  /** shadcn parity: <ChartLegend content={<ChartLegendContent />} /> */
  content: React.ReactElement | (() => React.ReactNode);
}

/** Positional wrapper: renders `content` wherever composed in the tree
 *  (rafters has no chart-shell "legend slot" prop -- compositional children,
 *  same rule XAxis/YAxis/CartesianGrid already follow). */
export function ChartLegend({ content }: ChartLegendProps): React.ReactElement {
  return <>{typeof content === 'function' ? content() : content}</>;
}

ChartLegend.displayName = 'ChartLegend';

export interface ChartLegendContentProps extends ChartLegendContentConfig {}

export function ChartLegendContent({ nameKey }: ChartLegendContentProps): React.ReactElement {
  const config = useChartConfig();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const classes = chartLegendClasses();
  const entries = legendEntries(config, nameKey);

  // Composes roving-focus directly (one primitive -- 05-authoring: no
  // colocated composition function needed). Ongoing/level-triggered (Spec
  // 03): starts on mount, tears down on unmount, same as toggle-group's own
  // `useEffect` composition of the same primitive.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return createRovingFocus(root, { orientation: 'horizontal' });
  }, []);

  const aria = chartLegend.aria({}, {}, { root: '', entry: '' });

  return (
    <div ref={rootRef} data-part="root" className={classy(classes.root)} {...aria.root}>
      {entries.map((entry) => (
        <span
          key={entry.key}
          data-part="entry"
          data-roving-item
          tabIndex={0}
          className={classy(classes.entry)}
          {...aria.entry}
        >
          <svg className={chartLegendSwatchWrapperClass()} viewBox="0 0 10 10" aria-hidden="true">
            <rect width="10" height="10" rx="2" className={entry.swatchClass} />
          </svg>
          <span className={classes.label}>{entry.label}</span>
        </span>
      ))}
    </div>
  );
}

ChartLegendContent.displayName = 'ChartLegendContent';

export default ChartLegend;
