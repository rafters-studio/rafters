/**
 * The emitted motion delay token sheet, for component tests that render a
 * tooltip or navigation-menu.
 *
 * These components read `--rafters-delay-*` off their mounted root at bind/effect
 * time through the runtime accessor (`primitives/motion-tokens.ts`). In a real
 * browser the emitted CSS declares those custom properties on `:root` and they
 * inherit down to the component; the accessor throws -- by design (#2132) -- when
 * a DOM exists but the property is declared nowhere, because that is a missing
 * token sheet, an authoring defect.
 *
 * happy-dom does not inherit custom properties through `getComputedStyle`, but it
 * DOES apply a `*` stylesheet rule, so one style element standing in for the
 * emitted sheet resolves the tokens on every element that reads them. Values
 * mirror `DEFAULT_DELAY_NAMESPACE` (hover-intent 200ms, linger 300ms) so timing
 * behaviour is identical to before the generator-derived fallback was removed.
 */
export function installMotionDelaySheet(): () => void {
  const style = document.createElement('style');
  style.dataset['motionDelaySheet'] = 'true';
  style.textContent = '* { --rafters-delay-hover-intent: 200ms; --rafters-delay-linger: 300ms; }';
  document.head.appendChild(style);
  return () => style.remove();
}
