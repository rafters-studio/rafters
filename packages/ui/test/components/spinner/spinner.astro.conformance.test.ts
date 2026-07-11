/**
 * Astro render adapter + the static-tier conformance suite for Spinner
 * (Spec 01 testing obligations; the AstroContainer render pattern from
 * container.astro.conformance.test.ts). Unlike Container/Grid, Spinner's
 * aria projection is real and unconditional, so contract fulfillment is
 * asserted directly against the score.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Spinner from '../../../src/components/spinner/spinner.astro';
import { spinner, type SpinnerConfig } from '../../../src/components/spinner/spinner.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Spinner, { props });
  // role="status" is a live region; axe wants it contained by a landmark,
  // same convention grid's conformance test uses for a bare fragment.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('spinner conformance [astro]', () => {
  it('defaults: role=status, "Loading" accessible name, default size/variant classes', async () => {
    const body = await render({});
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('output');
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-label')).toBe('Loading');
    expect(root.className).toContain('animate-spin');
    expect(root.className).toContain('border-primary');
    await assertAxeClean(body);
  });

  it('contract fulfillment: rendered ARIA equals the score projection', async () => {
    const config: SpinnerConfig = { size: 'lg', variant: 'destructive' };
    const body = await render(config);
    const root = partElement(body, 'root') as HTMLElement;
    const state = spinner.initialState(config);
    assertContractFulfillment(spinner, root, state, config, ['root']);
  });

  it('label overrides the default accessible name', async () => {
    const body = await render({ label: 'Saving changes' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Saving changes');
    await assertAxeClean(body);
  });

  it('size and variant select the ported token classes', async () => {
    const body = await render({ size: 'sm', variant: 'success' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('h-4 w-4');
    expect(root.className).toContain('border-success');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'mx-auto' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('animate-spin');
    expect(root.className).toContain('mx-auto');
  });
});
