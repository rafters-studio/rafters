/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name:
 * `grid grid-flow-col items-center gap-2` on the row, the matching
 * `grid-cols-affix-*` track list, and `inline-grid place-items-center` on the
 * wrappers. The classes themselves are proven to compile to these rules in
 * input.classes.test.ts. No physical direction anywhere, so `dir="rtl"`
 * reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="row"] { display: grid; grid-auto-flow: column; align-items: center; column-gap: 8px; width: 300px; grid-template-columns: auto 1fr; }
    [data-part="row"]:not(:has([data-icon="inline-start"])) { grid-template-columns: 1fr auto; }
    [data-part="row"]:has([data-icon="inline-start"]):has([data-icon="inline-end"]) { grid-template-columns: auto 1fr auto; }
    [data-part="row"] > [data-part="input"] { min-width: 0; width: 100%; box-sizing: border-box; }
    [data-part="addonStart"], [data-part="addonEnd"], [data-part="startIcon"], [data-part="endIcon"] { display: inline-grid; place-items: center; }
  `;
  document.head.appendChild(style);
  return () => {
    style.remove();
    document.documentElement.removeAttribute('dir');
  };
}

export interface Rects {
  start: DOMRect | null;
  field: DOMRect;
  end: DOMRect | null;
  row: DOMRect;
}

export function rectsOf(row: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null =>
    row.querySelector(`[data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const field = rect('input');
  if (!field) throw new Error('no input part');
  return {
    start: rect('startIcon'),
    field,
    end: rect('endIcon'),
    row: row.getBoundingClientRect(),
  };
}
