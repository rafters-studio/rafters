/**
 * @lib contract
 */
import type { BehaviorSpec } from '../../lib/contract';
import { breadcrumbIconClasses } from './breadcrumb.classes';

/**
 * Breadcrumb: a hierarchical location trail. The wayfinding archetype -- a
 * static score with NO state, NO actions, NO keymap, NO effects, and (like
 * Card and Container) an EMPTY, structural aria projection. The trail's
 * semantics are carried NATIVELY by the markup each performance renders: the
 * root is a `nav` landmark labelled `Breadcrumb`, ancestor links are plain
 * `a` elements, the current page is a `role="link" aria-disabled="true"
 * aria-current="page"` node (not a link -- the current page is never
 * clickable), and separators/ellipses are `aria-hidden="true"
 * role="presentation"` decorations. None of that is a projection the score
 * computes; it is fixed markup the decorators write, so the score projects
 * nothing.
 *
 * Because the projection is empty and there is nothing to react to, Breadcrumb
 * needs NO client at all: there is no `bindBreadcrumb`, the React controller
 * uses no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
 * and the Web Component performs no binding. A pure static's framework files
 * are the thinnest possible: markup + classes + slots, nothing more. The score
 * is declared only so the conformance harness can assert the one real contract
 * (the `root` part renders and projects no ARIA) identically across React, the
 * Web Component, and Astro.
 *
 * The composition family (BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
 * BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis) carries no
 * behaviour of its own -- those are plain framework wrappers over literal
 * class strings, composed by the consumer inside a Breadcrumb. Only `root`
 * (the nav landmark) is a declared part, because it is the only node with a
 * contract to project (boundary 5: a binding rendering an undeclared part is
 * structure the score never authorized).
 */

export type BreadcrumbConfig = Record<never, never>;
export type BreadcrumbState = Record<never, never>;
export type BreadcrumbActions = Record<never, never>;
export type BreadcrumbIconPart = 'startIcon' | 'endIcon';
export type BreadcrumbPart = 'root' | BreadcrumbIconPart;

export const breadcrumb: BehaviorSpec<
  BreadcrumbConfig,
  BreadcrumbState,
  BreadcrumbActions,
  BreadcrumbPart
> = {
  name: 'breadcrumb',
  parts: { root: {}, startIcon: { optional: true }, endIcon: { optional: true } },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The nav landmark, the current-page marker, and the hidden separators are
  // native to the markup each performance renders; the root projects nothing.
  // Each decorative icon wrapper beside a link or page label is present only
  // when the author gives an icon, and hides it from assistive technology in
  // the server markup, with no script run: the label alone is the name.
  aria: () => ({
    root: {},
    startIcon: { 'aria-hidden': 'true' },
    endIcon: { 'aria-hidden': 'true' },
  }),
  keymap: () => null,
};

/**
 * Wrap each `slot="start-icon"` / `slot="end-icon"` child of a trail link or
 * current page in the decorative wrapper the behavior projects aria-hidden
 * onto. The trail is consumer-composed light DOM, so the slot attribute is only
 * the author's marker. The start wrapper goes first and the end wrapper last,
 * so the label sits between them in reading order. Idempotent.
 */
export function wrapBreadcrumbIcons(scope: ParentNode): void {
  const classes = breadcrumbIconClasses;
  const kinds = [
    { slot: 'start-icon', part: 'startIcon', icon: 'inline-start' },
    { slot: 'end-icon', part: 'endIcon', icon: 'inline-end' },
  ] as const;
  const aria = breadcrumb.aria({}, {}, { root: '', startIcon: '', endIcon: '' });
  for (const host of scope.querySelectorAll<HTMLElement>('a, [aria-current="page"]')) {
    for (const kind of kinds) {
      const child = host.querySelector(`:scope > [slot="${kind.slot}"]`);
      if (!child || host.querySelector(`:scope > [data-part="${kind.part}"]`)) continue;
      const wrapper = document.createElement('span');
      wrapper.dataset['part'] = kind.part;
      wrapper.dataset['icon'] = kind.icon;
      for (const [name, value] of Object.entries(aria[kind.part] ?? {})) {
        wrapper.setAttribute(name, String(value));
      }
      wrapper.className = classes;
      child.removeAttribute('slot');
      wrapper.appendChild(child);
      if (kind.slot === 'start-icon') host.insertBefore(wrapper, host.firstChild);
      else host.appendChild(wrapper);
    }
  }
}
