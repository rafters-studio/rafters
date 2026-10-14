/**
 * The browser test page loads no compiled Tailwind sheet, so geometry is
 * measured against a stand-in for the structural rules the classes name:
 * `grid grid-cols-menu-row` on the content (auto auto 1fr auto) with each menu
 * item a subgrid row, the icon in column 2 and the label in column 3. The
 * classes are proven to compile to these rules in context-menu.classes.test.ts.
 * No physical direction anywhere, so `dir="rtl"` reorders the columns.
 */
export const ICON_SVG_16 =
  '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

export function installIconLayout(): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [data-part="content"] { display: grid; grid-template-columns: auto auto 1fr auto; width: 320px; }
    [data-part="content"][hidden] { display: none; }
    [data-part="content"] [role^="menuitem"] { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1; align-items: center; }
    [data-part="content"] [data-part="startIcon"] { grid-column: 2; display: inline-grid; place-items: center; }
    [data-part="content"] [data-part="label"] { grid-column: 3; }
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
