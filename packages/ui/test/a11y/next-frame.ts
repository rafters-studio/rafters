/** Resolves after the next animation frame, so a caller can await a layout
 *  or ResizeObserver callback that requestAnimationFrame schedules. */
export function nextFrame(): Promise<void> {
  return new Promise<void>((done) => requestAnimationFrame(() => done()));
}
