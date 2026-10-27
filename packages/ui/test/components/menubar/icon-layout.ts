/**
 * The browser test page loads no compiled Tailwind sheet, so geometry is
 * measured against a stand-in for the structural rules the classes name: the
 * menu is `grid grid-cols-menu-row` (auto auto 1fr auto) and each item a
 * subgrid row, with the icon in column 2 and the label column from 3; the
 * trigger is a one-row grid in reading order. The classes are proven to carry
 * these literals in menubar.classes.test.ts. No physical direction anywhere,
 * so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="trigger"] { display: inline-grid; grid-auto-flow: column; align-items: center; }
    [data-part="content"] { display: grid; grid-template-columns: auto auto 1fr auto; width: 320px; }
    [data-part="item"] { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1; align-items: center; }
    [data-part="item"] > [data-part="startIcon"] { grid-column: 2; grid-row: 1; display: inline-grid; place-items: center; }
    [data-part="item"] > :last-child { grid-column: 3 / span 2; grid-row: 1; }
  `;
  document.head.appendChild(style);
  return () => {
    style.remove();
    document.documentElement.removeAttribute('dir');
  };
}

export function rect(root: ParentNode, selector: string): DOMRect {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`no ${selector}`);
  return el.getBoundingClientRect();
}
