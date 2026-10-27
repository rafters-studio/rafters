/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name. The
 * stand-in mirrors `inline-grid grid-flow-col items-center gap-2` on the item
 * and `inline-grid place-items-center` on the wrappers; the classes themselves
 * are proven to compile to these rules in toggle-group.classes.test.ts. No
 * physical direction anywhere, so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="item"] { display: inline-grid; grid-auto-flow: column; align-items: center; column-gap: 8px; }
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

/** The label is the item's own text node, so it is measured with a Range. */
export function rectsOf(item: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null =>
    item.querySelector(`[data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const text = Array.from(item.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
  );
  if (!text) throw new Error('no label text node');
  const range = document.createRange();
  range.selectNodeContents(text);
  return { start: rect('startIcon'), label: range.getBoundingClientRect(), end: rect('endIcon') };
}
