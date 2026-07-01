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
import type { ActionPayloads, BehaviorSpec, PartIds } from '../../src/behavior/contract';

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
