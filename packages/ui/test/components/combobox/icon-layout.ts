/**
 * The browser test page loads no compiled Tailwind sheet, so geometry is
 * measured against a stand-in for the structural rules the classes name:
 * `grid grid-cols-menu-row` on the field (auto auto 1fr auto) with the input
 * spanning every column, the icon in column 2 and the toggle in column 4; and
 * the same track list on the content with each option a subgrid. The classes
 * are proven to compile to these rules in combobox.classes.test.ts. No physical
 * direction anywhere, so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="field"] { display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; width: 320px; }
    [data-part="field"] > [data-part="input"] { grid-column: 1 / -1; grid-row: 1; }
    [data-part="field"] > [data-part="startIcon"] { grid-column: 2; grid-row: 1; display: inline-grid; place-items: center; }
    [data-part="field"] > [data-part="trigger"] { grid-column: 4; grid-row: 1; }
    [data-part="content"] { display: grid; grid-template-columns: auto auto 1fr auto; }
    [data-part="content"][hidden] { display: none; }
    [data-part="item"] { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1; align-items: center; }
    [data-part="item"] > :first-child { grid-column: 1; }
    [data-part="item"] > [data-part="startIcon"] { grid-column: 2; display: inline-grid; place-items: center; }
    [data-part="item"] > :last-child { grid-column: 3; }
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
