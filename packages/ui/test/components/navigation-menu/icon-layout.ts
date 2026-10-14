/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name:
 * `inline-grid grid-flow-col items-center gap-*` on the trigger and the link, and
 * `inline-grid place-items-center` on the wrappers. The classes themselves are
 * proven in navigation-menu.classes.test.ts. No physical direction anywhere, so
 * `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="trigger"], [data-part="content"] a { display: inline-grid; grid-auto-flow: column; align-items: center; column-gap: 8px; }
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

/** The label is the row's own text, measured with a range over its text nodes. */
export function rectsOf(row: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null =>
    row.querySelector(`[data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const range = document.createRange();
  const text = [...row.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
  );
  if (!text) throw new Error('no label text');
  range.selectNodeContents(text);
  return { start: rect('startIcon'), label: range.getBoundingClientRect(), end: rect('endIcon') };
}
