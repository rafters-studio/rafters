/**
 * WC decorator of the Progress score, driven against light-DOM markup. Same
 * score as the React and Astro conformances: the host IS the progressbar root
 * (host === root), bindProgress projects the aria-value contract and sizes the
 * indicator fill. Proves the static projection drives identically through the
 * DOM binding, and that a live attribute change re-derives config.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersProgress } from '../../../src/components/progress/progress.element';
import { progress, type ProgressConfig } from '../../../src/components/progress/progress.behavior';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

const parts = ['root', 'indicator'] as const;

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

describe('progress conformance [wc]', () => {
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
    assertContractFulfillment(progress, root, {}, config, parts);
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

  it('is axe-clean with an accessible name', async () => {
    document.body.innerHTML =
      '<main><rafters-progress data-value="50" aria-label="Upload progress"></rafters-progress></main>';
    await Promise.resolve();
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
