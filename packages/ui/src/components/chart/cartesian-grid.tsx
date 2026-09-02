/**
 * Background grid lines for a cartesian chart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - Two optional booleans, both defaulting to shadcn's
 * "on". No visual output of its own.
 * @attention-economics Invisible until a chart-type component (Bar/Line/Area)
 * reads it; never competes for attention on its own.
 * @trust-building Its presence or absence is the whole signal -- a consumer
 * always knows whether a chart has background grid lines by reading the
 * tree, not by hunting for a boolean prop on the chart itself.
 * @accessibility Decorative only, once real lines are drawn by the owning
 * chart type -- never announced to assistive tech.
 * @semantic-meaning Ports shadcn's `<CartesianGrid vertical={false} />` call
 * site verbatim.
 *
 * @usage-patterns
 * DO: Compose as a child of a cartesian chart when it needs background lines
 * DO: Set horizontal/vertical to false to suppress one axis of lines
 * NEVER: Render line coordinates here -- the owning chart type does, from
 *        its own plot rectangle and data domain (graph.ts gridLines/ticks)
 *
 * @example
 * ```tsx
 * <ChartContainer config={config}>
 *   <CartesianGrid vertical={false} />
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import type { CartesianGridConfig } from './cartesian-grid.behavior';

export interface CartesianGridProps extends CartesianGridConfig {}

/** A structural marker: honestly empty until the chart-type component that
 *  reads it draws real lines (`graph.ts` `gridLines()`) against its own plot
 *  rectangle. */
export const CartesianGrid: React.FC<CartesianGridProps> = ({
  horizontal = true,
  vertical = true,
}) => (
  <div
    data-part="grid"
    data-horizontal={horizontal ? 'true' : 'false'}
    data-vertical={vertical ? 'true' : 'false'}
    hidden
  />
);

CartesianGrid.displayName = 'CartesianGrid';

export default CartesianGrid;
