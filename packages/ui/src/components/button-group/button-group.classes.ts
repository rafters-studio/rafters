import type {
  ButtonGroupConfig,
  ButtonGroupOrientation,
  ButtonGroupState,
} from './button-group.behavior';

export interface ButtonGroupClassSet {
  root: string;
}

/** Always-on layout: an inline flex row/column of adjoined buttons. */
const baseClasses = 'inline-flex';

/** Per-orientation flex-direction. */
const orientationClasses: Record<ButtonGroupOrientation, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

/**
 * Connected-border rules for horizontal groups (ported verbatim from the
 * oracle, src/old/ui/button-group.classes.ts):
 *   - First child: clear right radius so it joins the next button.
 *   - Last child: clear left radius so it joins the prior button.
 *   - Middle children: clear both so they sit flush between neighbors.
 *   - Non-first children: negative left margin collapses the shared 1px border.
 */
const horizontalConnectedClasses = [
  '[&>*:first-child]:rounded-r-none',
  '[&>*:last-child]:rounded-l-none',
  '[&>*:not(:first-child):not(:last-child)]:rounded-none',
  '[&>*:not(:first-child)]:-ml-px',
].join(' ');

/**
 * Connected-border rules for vertical groups (ported verbatim from the oracle):
 *   - First child: clear bottom radius so it joins the next button.
 *   - Last child: clear top radius so it joins the prior button.
 *   - Middle children: clear both so they sit flush between neighbors.
 *   - Non-first children: negative top margin collapses the shared 1px border.
 */
const verticalConnectedClasses = [
  '[&>*:first-child]:rounded-b-none',
  '[&>*:last-child]:rounded-t-none',
  '[&>*:not(:first-child):not(:last-child)]:rounded-none',
  '[&>*:not(:first-child)]:-mt-px',
].join(' ');

/**
 * Raise the currently focus-visible child above its neighbors so the single
 * focus ring is not clipped by the overlapping collapsed borders.
 */
const focusStackingClasses = '[&>*:focus-visible]:z-10';

export function buttonGroupClasses(
  config: ButtonGroupConfig,
  _state: ButtonGroupState,
): ButtonGroupClassSet {
  const connected =
    config.orientation === 'vertical' ? verticalConnectedClasses : horizontalConnectedClasses;
  const root = [
    baseClasses,
    orientationClasses[config.orientation],
    connected,
    focusStackingClasses,
  ].join(' ');
  return { root };
}
