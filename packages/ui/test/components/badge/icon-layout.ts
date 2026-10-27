/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name:
 * `inline-grid grid-flow-col items-center gap-1` on the root and
 * `inline-grid place-items-center` on the wrappers. The classes themselves are
 * proven to compile to these rules in badge.classes.test.ts. No physical
 * direction anywhere, so `dir="rtl"` reorders the columns. The label is an
 * element the test authors with `data-label`, so its box can be measured.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="root"] { display: inline-grid; grid-auto-flow: column; align-items: center; column-gap: 4px; }
    [data-part="startIcon"], [data-part="endIcon"] { display: inline-grid; place-items: center; }
  `;
  document.head.appendChild(style);
  return () => {
    style.remove();
    document.documentElement.removeAttribute('dir');
  };
}

export interface Rects {
  start: DOMRect | null;
  label: DOMRect;
  end: DOMRect | null;
}

/** `scope` is the root (React, Astro) or the host (Web Component, whose wrappers sit in its shadow). */
export function rectsOf(scope: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null => {
    const found =
      scope.querySelector(`[data-part="${part}"]`) ??
      scope.shadowRoot?.querySelector(`[data-part="${part}"]`);
    return found?.getBoundingClientRect() ?? null;
  };
  const label = scope.querySelector('[data-label]')?.getBoundingClientRect();
  if (!label) throw new Error('no [data-label] element');
  return { start: rect('startIcon'), label, end: rect('endIcon') };
}
