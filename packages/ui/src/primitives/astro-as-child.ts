/**
 * Astro's `asChild` primitive: render-then-inject. Astro has no client runtime
 * to clone an element and merge props onto it the way React's
 * `React.cloneElement` + `mergeProps` (`primitives/slot.ts`) does, so this is
 * the server-side equivalent: render the default slot to a string, parse it
 * with `ultrahtml` (Astro's own HTML parser dependency, added to
 * `@rafters/ui` for this), merge the part's decoration and the caller's own
 * passthrough attributes onto the FIRST element the slot rendered, drop that
 * element's own `class`, and re-serialize.
 *
 * Proven on Astro 6.4.8 and 7.3.2 (legion reflection 01a08406; the toy at
 * `.claude/scratch/aschild-toy/b/menu-button.astro`, 21 passing tests per
 * major). Shared by every sidebar part that carries `asChild`
 * (`SidebarGroupLabel`, `SidebarGroupAction`, `SidebarMenuButton`,
 * `SidebarMenuAction`, `SidebarMenuSubButton`) so the parse/merge logic is
 * written once, not five times.
 */
import { ELEMENT_NODE, type ElementNode, type Node, parse, renderSync } from 'ultrahtml';

function isElement(node: Node): node is ElementNode {
  return node.type === ELEMENT_NODE;
}

function toStringAttrs(source: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === false) continue;
    out[key] = value === true ? '' : String(value);
  }
  return out;
}

/**
 * Injects `attrs` (the caller's own passthrough props) and `decoration` (the
 * part's class + `data-*` projection, which always wins over the child's own
 * `class`) onto the first element of `slotHtml`. Returns the re-serialized
 * HTML, or `null` when the slot rendered no element -- the caller falls back
 * to its own tag in that case.
 */
export function injectAsChildAttrs(
  slotHtml: string,
  attrs: Record<string, unknown>,
  decoration: Record<string, string>,
): string | null {
  const doc: unknown = parse(slotHtml);
  const children = (doc as { children: Node[] }).children;
  const first = children.find(isElement);
  if (first === undefined) return null;
  const { class: _childClass, ...childAttrs } = first.attributes;
  first.attributes = {
    ...childAttrs,
    ...toStringAttrs(attrs),
    ...decoration,
  };
  return renderSync(doc as Node);
}
