/**
 * Astro performance of the ButtonGroup static score. AstroContainer renders the
 * SSR markup with the score's constant projection (role="group") already
 * applied; there is no <script> because a static score has no client runtime to
 * bind. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import ButtonGroup from '../../../src/components/button-group/button-group.astro';
import { buttonGroup } from '../../../src/components/button-group/button-group.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const BUTTONS = '<button type="button">Cancel</button><button type="button">Save</button>';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>, slot = BUTTONS): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(ButtonGroup, {
    props,
    slots: { default: slot },
  });
  // Wrap in <main> so axe's region rule (all content contained by a landmark)
  // is satisfied -- role=group is not itself a landmark.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('button-group conformance [astro]', () => {
  it('fulfills the contract: root renders and carries role=group', async () => {
    const body = await render({ 'aria-label': 'Text style' });
    const root = partElement(body, 'root') as HTMLElement;
    assertContractFulfillment(buttonGroup, root, {}, { orientation: 'horizontal' }, ['root']);
    await assertAxeClean(body);
  });

  it('orientation drives the reflected attribute and connected classes', async () => {
    const body = await render({ orientation: 'vertical', 'aria-label': 'View' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('data-orientation')).toBe('vertical');
    expect(root.className).toContain('flex-col');
    // Astro SSR HTML-escapes the `&` in the arbitrary selector, so assert the
    // unescaped vertical border-collapse token rather than the full `[&>*]` form.
    expect(root.className).toContain('-mt-px');
  });

  it('aria-label is a passed-through attribute (no server-side aria projection of the label)', async () => {
    const body = await render({ 'aria-label': 'Document actions' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Document actions');
    expect(root.getAttribute('role')).toBe('group');
  });

  it('forwards arbitrary attributes (id, data-*) -- one score, three performances', async () => {
    const body = await render({ id: 'group-1', 'data-testid': 'bg', 'aria-label': 'Actions' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('id')).toBe('group-1');
    expect(root.getAttribute('data-testid')).toBe('bg');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'mt-4', 'aria-label': 'Actions' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('inline-flex');
    expect(root.className).toContain('mt-4');
  });
});
