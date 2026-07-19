/**
 * The conformance harness (Spec 01, testing obligations).
 *
 * ONE harness, N render adapters. A binding is conformant when, for every
 * scenario: (1) axe reports no violations, (2) every declared part is
 * present and the DOM's ARIA equals the behavior's aria projection,
 * (3) keymap keys move state and DOM (interaction assertions live with the
 * component suite, since observables are component-specific).
 *
 * Adding a framework means writing a render adapter (~10 lines) and
 * inheriting this entire suite.
 */
import { expect } from 'vitest';
import { axe } from 'vitest-axe';
import type { ActionPayloads, BehaviorSpec, PartIds } from '../../src/lib/contract';

export interface RenderResult {
  /** The element axe runs against (a container is fine). */
  host: HTMLElement;
  /** The element carrying data-part="root". */
  root: HTMLElement;
  cleanup: () => void;
}

export function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Every rendered instance of a many part (Spec 01: PartDecl.many). */
export function partElements(root: HTMLElement, part: string): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
  if (root.getAttribute('data-part') === part) all.unshift(root);
  return all;
}

/** Text content of a part, following slots into the light DOM so the same
 *  assertion works for shadow-DOM bindings. */
export function partText(root: HTMLElement, part: string): string {
  const element = partElement(root, part);
  if (!element) return '';
  const slot = element.querySelector('slot');
  if (slot) {
    return slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join('');
  }
  return element.textContent ?? '';
}

/** Read the ids the binding actually rendered, so the projection can be
 *  compared against real DOM (behaviors never generate ids -- Spec 01). */
export function domPartIds<Part extends string>(
  root: HTMLElement,
  parts: ReadonlyArray<Part>,
): PartIds<Part> {
  const ids = {} as PartIds<Part>;
  for (const part of parts) {
    ids[part] = partElement(root, part)?.id ?? '';
  }
  return ids;
}

export async function assertAxeClean(host: HTMLElement): Promise<void> {
  const results = await axe(host);
  expect(results.violations).toEqual([]);
}

/**
 * Tier 2: every expected part present (with its declared role), and the
 * rendered ARIA equals the behavior's projection -- including absence:
 * a projected `undefined` means the attribute must not be rendered.
 */
export function assertContractFulfillment<
  Config,
  State,
  Actions extends ActionPayloads,
  Part extends string,
>(
  spec: BehaviorSpec<Config, State, Actions, Part>,
  root: HTMLElement,
  state: State,
  config: Config,
  expectedParts: ReadonlyArray<Part>,
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = spec.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }

  const allParts = Object.keys(spec.parts) as Part[];
  const ids = domPartIds(root, allParts);
  const projection = spec.aria(state, config, ids);

  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs) continue;
    const element = partElement(root, part);
    if (!expectedParts.includes(part)) {
      continue; // optional part absent in this scenario
    }
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/**
 * Tier 2 for `many` parts, BESPOKE variant: the suite supplies an
 * `instanceAria(key)` closure and the DOM-order instance keys. Used by
 * uniform-item components (radio-group, table) whose per-instance projection
 * takes only the key -- no sibling ids -- so it lives beside the component, not
 * on the spec. Spec-driven many parts (nav-menu) use
 * `assertInstanceAriaFulfillment` below instead.
 */
export function assertInstanceContractFulfillment<Part extends string>(
  root: HTMLElement,
  part: Part,
  instanceKeys: ReadonlyArray<string>,
  instanceAria: (key: string) => Record<string, string | boolean | undefined>,
): void {
  const elements = partElements(root, part);
  expect(elements.length, `many part "${part}": rendered instances must match supplied keys`).toBe(
    instanceKeys.length,
  );

  for (const [i, key] of instanceKeys.entries()) {
    const element = elements[i];
    expect(element, `instance "${key}" of part "${part}"`).toBeDefined();
    if (!element) continue;
    for (const [attr, value] of Object.entries(instanceAria(key))) {
      if (value === undefined) {
        expect(
          element.hasAttribute(attr),
          `instance "${key}" of "${part}" must NOT render ${attr}`,
        ).toBe(false);
      } else {
        expect(element.getAttribute(attr), `instance "${key}" of "${part}" ${attr}`).toBe(
          String(value),
        );
      }
    }
  }
}

/**
 * Tier 2 for `many` parts (Spec 01, BehaviorSpec.instanceAria): the score's own
 * `instanceAria(part, value, state, config, ids)` projects each instance, and
 * this driver asserts every rendered instance against it -- generically, with
 * NO per-component wiring. It reads which parts are `many` from the spec, finds
 * each instance by its `data-value`, resolves the instance's sibling ids from
 * the DOM (behaviors never generate ids -- Spec 01), and compares.
 *
 * A spec that omits `instanceAria` (statics, uniform-item components) has no
 * per-instance ARIA to assert, so this is a no-op for them.
 */
export function assertInstanceAriaFulfillment<
  Config,
  State,
  Actions extends ActionPayloads,
  Part extends string,
>(
  spec: BehaviorSpec<Config, State, Actions, Part>,
  root: HTMLElement,
  state: State,
  config: Config,
): void {
  const project = spec.instanceAria;
  if (!project) return;

  const manyParts = (Object.keys(spec.parts) as Part[]).filter((part) => spec.parts[part].many);
  for (const part of manyParts) {
    for (const element of partElements(root, part)) {
      const value = element.dataset['value'];
      if (value === undefined) continue;
      const ids: Partial<Record<Part, string>> = {};
      for (const sibling of manyParts) {
        ids[sibling] =
          root.querySelector<HTMLElement>(`[data-part="${sibling}"][data-value="${value}"]`)?.id ??
          '';
      }
      for (const [attr, projected] of Object.entries(project(part, value, state, config, ids))) {
        if (projected === undefined) {
          expect(
            element.hasAttribute(attr),
            `instance "${value}" of "${part}" must NOT render ${attr}`,
          ).toBe(false);
        } else if (typeof projected === 'boolean') {
          // A boolean projection asserts PRESENCE, not a serialized value:
          // React writes hidden={true} as `hidden=""` while the DOM-native
          // binding writes `hidden="true"`. hasAttribute is the only check that
          // holds across all three frameworks. (Only `true`/undefined occur on
          // nav-menu's `hidden`; a boolean `false` would diverge, but no score
          // emits one -- absence is expressed as undefined.)
          expect(element.hasAttribute(attr), `instance "${value}" of "${part}" ${attr}`).toBe(
            projected,
          );
        } else {
          expect(element.getAttribute(attr), `instance "${value}" of "${part}" ${attr}`).toBe(
            projected,
          );
        }
      }
    }
  }
}
