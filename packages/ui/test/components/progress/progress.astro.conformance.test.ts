/**
 * Astro decorator of the Progress score. Progress is a STATIC score, but its
 * ARIA projection is LIVE (the progressbar value contract), so this test drives
 * it end to end. AstroContainer renders the SSR markup but does NOT run the
 * <script>, so the test calls bindProgress directly -- that IS the script's job.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Progress from '../../../src/components/progress/progress.astro';
import {
  bindProgress,
  progress,
  type ProgressConfig,
} from '../../../src/components/progress/progress.behavior';
import {
  assertAxeClean,
  assertConfigTravelsAsData,
  assertContractFulfillment,
  partElement,
} from '../../harness/conformance';

const parts = ['root', 'indicator'] as const;

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown>): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Progress, { props });
  // Wrap in a landmark so the progressbar is contained (axe 'region').
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-part="root"][data-progress]') as HTMLElement;
  bindProgress(root); // the <script> does this per instance on the real page
  return root;
}

describe('progress conformance [astro]', () => {
  it('determinate: SSR markup carries the progressbar contract, bind re-affirms', async () => {
    const root = await mount({ value: 66, 'aria-label': 'Upload progress' });
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-valuenow')).toBe('66');
    expect(root.getAttribute('aria-busy')).toBeNull();

    const indicator = partElement(root, 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('66%');

    const config: ProgressConfig = { value: 66, max: 100, variant: 'default', size: 'default' };
    assertContractFulfillment(progress, root, {}, config, parts);
    await assertAxeClean(document.body);
  });

  it('indeterminate: no valuenow, aria-busy set, animation class, no fill width', async () => {
    const root = await mount({ 'aria-label': 'Loading' });
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('true');
    const indicator = partElement(root, 'indicator') as HTMLElement;
    expect(indicator.className).toContain('animate-pulse-shimmer');
    expect(indicator.getAttribute('style')).toBeNull();
    await assertAxeClean(document.body);
  });

  it('custom max and valueText reflect in the projection', async () => {
    const root = await mount({
      value: 3,
      max: 10,
      valueText: '3 of 10 files',
      'aria-label': 'Files',
    });
    expect(root.getAttribute('aria-valuemax')).toBe('10');
    expect(root.getAttribute('aria-valuenow')).toBe('3');
    expect(root.getAttribute('aria-valuetext')).toBe('3 of 10 files');
  });

  it('consumer class merges via classy', async () => {
    const root = await mount({ value: 50, class: 'my-4', 'aria-label': 'Upload' });
    expect(root.className).toContain('rounded-full');
    expect(root.className).toContain('my-4');
  });

  // The #2001 pairing: config is data-* in the markup AND read through dataset
  // in the bind. `value`/`max` are real on <progress> and `size` on input/select,
  // so the bare spellings must not appear on this <div> at all.
  it('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
    const root = await mount({
      value: 3,
      max: 10,
      variant: 'success',
      size: 'lg',
      valueText: '3 of 10 files',
      'aria-label': 'Files',
    });

    assertConfigTravelsAsData(root, {
      value: '3',
      max: '10',
      variant: 'success',
      size: 'lg',
      valueText: '3 of 10 files',
    });

    // Rehydration: wipe the projected value contract and the fill, re-bind, and
    // both come back -- only possible by reading the config from dataset.
    const indicator = partElement(root, 'indicator') as HTMLElement;
    root.removeAttribute('aria-valuenow');
    root.removeAttribute('aria-valuemax');
    indicator.removeAttribute('style');
    bindProgress(root);
    expect(root.getAttribute('aria-valuenow')).toBe('3');
    expect(root.getAttribute('aria-valuemax')).toBe('10');
    expect(root.getAttribute('aria-valuetext')).toBe('3 of 10 files');
    expect(indicator.style.width).toBe('30%');
  });
});
