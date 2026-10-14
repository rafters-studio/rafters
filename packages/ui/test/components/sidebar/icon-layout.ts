/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name. The
 * stand-in mirrors `inline-grid w-full grid-flow-col items-center gap-2` on the
 * menu buttons and `inline-grid place-items-center` on the wrappers; the classes
 * themselves are proven to compile to these rules in sidebar.classes.test.ts. No
 * physical direction anywhere, so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export const BUTTON_SELECTOR = '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    ${BUTTON_SELECTOR} { display: inline-grid; grid-auto-flow: column; align-items: center; column-gap: 8px; }
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

export function rectsOf(button: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null =>
    button.querySelector(`[data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const label = rect('label');
  if (!label) throw new Error('no label part');
  return { start: rect('startIcon'), label, end: rect('endIcon') };
}
