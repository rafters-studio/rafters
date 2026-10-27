/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name:
 * `inline-grid grid-flow-col items-center gap-1.5` on the link and the page,
 * and `inline-grid place-items-center` on the wrappers. The classes themselves
 * are proven to compile to these rules in breadcrumb.classes.test.ts. No
 * physical direction anywhere, so `dir="rtl"` reorders the columns. The label
 * is an element the test authors with `data-label`, so its box can be measured.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    a, [aria-current="page"] { display: inline-grid; grid-auto-flow: column; align-items: center; column-gap: 6px; }
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

/** `scope` is the link or the current page whose wrappers and label are measured. */
export function rectsOf(scope: Element): Rects {
  const rect = (part: string): DOMRect | null =>
    scope.querySelector(`[data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const label = scope.querySelector('[data-label]')?.getBoundingClientRect();
  if (!label) throw new Error('no [data-label] element');
  return { start: rect('startIcon'), label, end: rect('endIcon') };
}
