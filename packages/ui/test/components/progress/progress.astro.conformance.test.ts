import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Progress from '../../../src/components/progress/progress.astro';
import { progress } from '../../../src/components/progress/progress.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Progress, { props });
  // role=progressbar is content, not a landmark; axe's region rule wants it
  // contained the same way container/grid's astro suites wrap theirs.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('progress conformance [astro]', () => {
  it('determinate: role, clamped valuenow, and the contract hold', async () => {
    const body = await render({ value: 40, max: 80, 'aria-label': 'Upload progress' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-valuenow')).toBe('40');
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('80');
    expect(root.hasAttribute('aria-busy')).toBe(false);
    expect(root.getAttribute('data-state')).toBe('determinate');

    assertContractFulfillment(
      progress,
      root,
      progress.initialState({ value: 40, max: 80 }),
      { value: 40, max: 80 },
      ['root', 'indicator'],
    );
    await assertAxeClean(body);
  });

  it('a value over max clamps -- aria-valuenow never exceeds aria-valuemax', async () => {
    const body = await render({ value: 150, max: 100 });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-valuenow')).toBe('100');
  });

  it('indeterminate: aria-valuenow omitted (not zero), aria-busy set', async () => {
    const body = await render({ 'aria-label': 'Loading' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('indeterminate');
    await assertAxeClean(body);
  });

  it('the indicator is decorative and carries no inline width while indeterminate', async () => {
    const body = await render({});
    const indicator = partElement(body, 'indicator') as HTMLElement;
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.style.width).toBe('');
    expect(indicator.getAttribute('data-state')).toBe('indeterminate');
  });

  it('the indicator width channel reflects the percentage when determinate', async () => {
    const body = await render({ value: 25, max: 100 });
    const indicator = partElement(body, 'indicator') as HTMLElement;
    expect(indicator.style.width).toBe('25%');
  });

  it('size selects the track height class', async () => {
    const body = await render({ value: 10, size: 'lg' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('h-3');
  });

  it('fill selects the indicator surface class; default is primary', async () => {
    const bodyDefault = await render({ value: 10 });
    expect(partElement(bodyDefault, 'indicator')?.className).toContain('bg-primary');

    const bodyDestructive = await render({ value: 10, fill: 'destructive' });
    expect(partElement(bodyDestructive, 'indicator')?.className).toContain('bg-destructive');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ value: 10, class: 'mt-4' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('mt-4');
  });
});
