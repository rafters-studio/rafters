import { expect } from 'vitest';
import { PLOT_HEIGHT, PLOT_WIDTH } from './plot-size';

/**
 * Resolves once a React chart has drawn against the pinned plot box.
 *
 * The chart first renders at the zero size ChartContainer starts with, then
 * again when ResizeObserver reports the real box, and that second point set
 * resets the cursor. Counting frames guesses when that happens; the viewBox
 * the plot svg is drawn with says it has.
 */
export async function reactPlotSettled(scope: ParentNode, height = PLOT_HEIGHT): Promise<void> {
  await expect
    .poll(() => scope.querySelector('svg[data-part="plot"]')?.getAttribute('viewBox'))
    .toBe(`0 0 ${PLOT_WIDTH} ${height}`);
}

/**
 * Resolves once a rafters-chart-container has published the pinned plot box.
 *
 * The chart binds re-mount from a MutationObserver on these attributes, and
 * that callback runs as a microtask of the attribute write, so by the time a
 * poll observes the final size the bind has already drawn against it.
 */
export async function elementPlotSettled(scope: ParentNode, height = PLOT_HEIGHT): Promise<void> {
  await expect
    .poll(() => {
      const container = scope.querySelector<HTMLElement>('rafters-chart-container');
      return container
        ? `${container.dataset['chartWidth']}x${container.dataset['chartHeight']}`
        : null;
    })
    .toBe(`${PLOT_WIDTH}x${height}`);
}

/**
 * Presses ArrowRight on a React chart root until exactly one mark is active.
 *
 * The cursor reset that follows a point-set change runs in a passive effect,
 * which React may flush after a keydown that lands between the resize commit
 * and that flush, wiping the key's result. Re-pressing while polling makes the
 * outcome independent of that ordering; the assertion is still that the key
 * activates exactly one mark.
 */
export async function activateFirstDatum(root: HTMLElement, activeSelector: string): Promise<void> {
  await expect
    .poll(() => {
      if (root.querySelectorAll(activeSelector).length === 0) {
        root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      }
      return root.querySelectorAll(activeSelector).length;
    })
    .toBe(1);
}
