/**
 * WC decorator of the Progress score, driven against light-DOM markup. Same
 * score as the React and Astro specs: the host IS the progressbar root
 * (host === root), bindProgress projects the aria-value contract and sizes the
 * indicator fill. Proves the static projection drives identically through the
 * DOM binding, and that a live attribute change re-derives config. Axe
 * cleanliness for this markup is asserted in the .a11y tier, not here.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersProgress } from '../../../src/components/progress/progress.element';
import {
  progress,
  type ProgressConfig,
  type ProgressPart,
  type ProgressState,
} from '../../../src/components/progress/progress.behavior';

const parts: readonly ProgressPart[] = ['root', 'indicator'];

beforeAll(() => {
  if (!customElements.get('rafters-progress')) {
    customElements.define('rafters-progress', RaftersProgress);
  }
});

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `<rafters-progress ${attrs}></rafters-progress>`;
  await Promise.resolve(); // let the element's deferred build + bind run
  return document.body.querySelector('rafters-progress') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function domPartIds(
  root: HTMLElement,
  expectedParts: readonly ProgressPart[],
): Record<ProgressPart, string> {
  const ids = {} as Record<ProgressPart, string>;
  for (const part of expectedParts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part renders (with its role), and the rendered ARIA equals
 *  the score's projection -- including absence: a projected `undefined` means
 *  the attribute must not be rendered. */
function assertContractFulfillment(
  root: HTMLElement,
  state: ProgressState,
  config: ProgressConfig,
  expectedParts: readonly ProgressPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = progress.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }

  const allParts = Object.keys(progress.parts) as ProgressPart[];
  const ids = domPartIds(root, allParts);
  const projection = progress.aria(state, config, ids);

  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
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

describe('progress [wc]', () => {
  it('determinate: host is the progressbar, projection fulfilled, fill sized', async () => {
    const host = await mount('data-value="66" aria-label="Upload progress"');
    const root = partElement(document.body, 'root') as HTMLElement;
    expect(root).toBe(host);
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-valuenow')).toBe('66');
    expect(root.getAttribute('aria-busy')).toBeNull();

    const indicator = partElement(root, 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('66%');

    const config: ProgressConfig = { value: 66, variant: 'default', size: 'default' };
    assertContractFulfillment(root, {}, config, parts);
  });

  it('indeterminate: no valuenow, aria-busy set, no fill width, animation class present', async () => {
    const host = await mount('aria-label="Loading"');
    expect(host.hasAttribute('aria-valuenow')).toBe(false);
    expect(host.getAttribute('aria-busy')).toBe('true');
    const indicator = partElement(host, 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('');
    expect(indicator.className).toContain('animate-pulse-shimmer');
  });

  it('custom data-max and data-value-text drive valuemax and the label', async () => {
    const host = await mount(
      'data-value="3" data-max="10" data-value-text="3 of 10 files" aria-label="Files"',
    );
    expect(host.getAttribute('aria-valuemax')).toBe('10');
    expect(host.getAttribute('aria-valuenow')).toBe('3');
    expect(host.getAttribute('aria-valuetext')).toBe('3 of 10 files');
  });

  it('a live value change re-derives the projection and the fill', async () => {
    const host = await mount('data-value="20" aria-label="Upload"');
    const before = host.querySelector<HTMLElement>('[data-part="indicator"]');
    expect(before?.style.width).toBe('20%');

    host.setAttribute('data-value', '80');
    const after = host.querySelector<HTMLElement>('[data-part="indicator"]');
    expect(host.getAttribute('aria-valuenow')).toBe('80');
    expect(after?.style.width).toBe('80%');
    // The indicator is reused, not duplicated.
    expect(host.querySelectorAll('[data-part="indicator"]')).toHaveLength(1);
  });
});
