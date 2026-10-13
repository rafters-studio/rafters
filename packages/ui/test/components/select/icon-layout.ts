/**
 * The browser test page loads no compiled Tailwind sheet, so geometry can only
 * be measured against a stand-in for the structural rules the classes name. The
 * stand-in mirrors the trigger and content classes (`grid grid-cols-menu-row`,
 * the items as `grid-cols-subgrid col-span-full gap-x-2`, explicit `col-start-*`
 * per cell, logical margins on the trigger icons); select.classes.test.ts proves
 * the classes themselves compile to these rules. No physical direction anywhere,
 * so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';
export const ICON_SVG_20 =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="trigger"] { display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; width: 240px; }
    [data-part="trigger"] > [data-part="startIcon"] { grid-column-start: 2; margin-inline-end: 8px; }
    [data-part="trigger"] > [data-part="value"] { grid-column-start: 3; }
    [data-part="trigger"] > [data-part="endIcon"] { grid-column-start: 4; margin-inline-start: 8px; }
    [data-part="trigger"] > svg:not([data-part]) { grid-column-start: 5; margin-inline-start: 8px; }
    [data-part="content"] { display: grid; grid-template-columns: auto auto 1fr auto; width: 240px; }
    [data-part="content"][hidden] { display: none; }
    [data-part="content"] > div { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; }
    [data-part="item"] { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; column-gap: 8px; }
    [data-part="item"] > :nth-child(1) { grid-column-start: 1; width: 14px; }
    [data-part="item"] > [data-part="startIcon"] { grid-column-start: 2; }
    [data-part="item"] > :not([data-part]):nth-child(n+2) { grid-column-start: 3; }
    [data-part="item"] > [data-part="endIcon"] { grid-column-start: 4; }
    [data-part="startIcon"], [data-part="endIcon"] { display: inline-grid; place-items: center; }
  `;
  document.head.appendChild(style);
  return () => {
    style.remove();
    document.documentElement.removeAttribute('dir');
  };
}

/** An item's own text cell: the child that is neither the indicator nor an icon wrapper. */
export function itemText(item: HTMLElement): HTMLElement {
  const text = Array.from(item.children).filter((el) => !el.hasAttribute('data-part'))[1];
  if (!(text instanceof HTMLElement)) throw new Error('no item text');
  return text;
}

export interface Rects {
  start: DOMRect | null;
  label: DOMRect;
  end: DOMRect | null;
}

export function triggerRects(root: HTMLElement): Rects {
  const trigger = root.querySelector('[data-part="trigger"]');
  const rect = (part: string): DOMRect | null =>
    trigger?.querySelector(`:scope > [data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  const label = rect('value');
  if (!label) throw new Error('no value part');
  return { start: rect('startIcon'), label, end: rect('endIcon') };
}

export function itemRects(item: HTMLElement): Rects {
  const rect = (part: string): DOMRect | null =>
    item.querySelector(`:scope > [data-part="${part}"]`)?.getBoundingClientRect() ?? null;
  return {
    start: rect('startIcon'),
    label: itemText(item).getBoundingClientRect(),
    end: rect('endIcon'),
  };
}
