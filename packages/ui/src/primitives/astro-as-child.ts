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

/**
 * Escapes a raw string for use inside a double-quoted attribute value.
 *
 * ultrahtml's serializer writes ` name="value"` verbatim: it escapes text
 * nodes and never attributes. Its parser is symmetrical about this -- it hands
 * back attribute values still encoded, so a round trip is lossless. That means
 * values PARSED from the child are already safe and must not be escaped again,
 * while values INJECTED here arrive as raw strings and must be. Without this,
 * a caller passing `title='"><script>...'` closes the attribute and lands a
 * live element in the `set:html` output.
 *
 * Ampersand goes first, or it would double-escape the entities the later
 * replacements introduce.
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toStringAttrs(source: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === false) continue;
    out[key] = value === true ? '' : escapeAttrValue(String(value));
  }
  return out;
}

/**
 * Injects the part's decoration and the caller's passthrough props onto the one
 * element `slotHtml` rendered, and returns the re-serialized HTML. Returns
 * `null` when the slot rendered no element at all, and the caller then falls
 * back to its own tag.
 *
 * Precedence, in increasing order of who wins, chosen to match what React's
 * `mergeProps` in `primitives/slot.ts` does so the two targets behave alike:
 *
 * 1. `attrs`, the props the caller put on the PART. Lowest, because React's
 *    merge ends with "default: child value overrides".
 * 2. The child's own attributes, minus its `class`. A child that states an
 *    `id` or an `aria-label` keeps it.
 * 3. `decoration`, the part's class and `data-*` projection. Highest, and
 *    deliberately unlike React for these keys: the projection IS the contract
 *    (Spec 00, boundary 6), so a child must not be able to make the component
 *    look right while announcing wrong. The child's `class` is dropped rather
 *    than merged, which is the same discard rafters applies on every target.
 *
 * More than one top-level element throws, as React's own `asChild` does
 * through `Children.only`. The alternative is worse: injecting into the first
 * element and emitting the rest untouched renders markup that silently escapes
 * both the decoration and the contract.
 */
export function injectAsChildAttrs(
  slotHtml: string,
  attrs: Record<string, unknown>,
  decoration: Record<string, string>,
): string | null {
  const doc: unknown = parse(slotHtml);
  const children = (doc as { children: Node[] }).children;
  const elements = children.filter(isElement);
  const first = elements[0];
  if (first === undefined) return null;
  if (elements.length > 1) {
    throw new Error(
      `asChild expects a single element, but the slot rendered ${elements.length} ` +
        `(${elements.map((el) => el.name).join(', ')}). Wrap them in one element.`,
    );
  }
  const { class: _childClass, ...childAttrs } = first.attributes;
  first.attributes = {
    ...toStringAttrs(attrs),
    ...childAttrs,
    ...toStringAttrs(decoration),
  };
  return renderSync(doc as Node);
}
