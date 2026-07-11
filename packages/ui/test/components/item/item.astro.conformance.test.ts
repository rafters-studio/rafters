/**
 * Astro render adapter for item's conformance suite (Spec 01 testing
 * obligations). Item projects no ARIA (no behavior.ts, no
 * assertContractFulfillment call -- container.astro.conformance.test.ts is
 * the precedent for a static with an empty projection): axe-clean plus
 * structural assertions is the whole obligation.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Item from '../../../src/components/item/item.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown>,
  slots: Record<string, string>,
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Item, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('item conformance [astro]', () => {
  it('content is always present; leading/trailing are absent without a slot', async () => {
    const body = await render({}, { default: 'Settings' });
    expect(partElement(body, 'content')).not.toBeNull();
    expect(partElement(body, 'leading')).toBeNull();
    expect(partElement(body, 'trailing')).toBeNull();
    await assertAxeClean(body);
  });

  it('leading and trailing render only when their slot is passed', async () => {
    const body = await render(
      {},
      {
        default: 'Profile',
        leading: '<svg aria-hidden="true"></svg>',
        trailing: '<span>3</span>',
      },
    );
    expect(partElement(body, 'leading')).not.toBeNull();
    expect(partElement(body, 'trailing')).not.toBeNull();
    await assertAxeClean(body);
  });

  it('leading content is not force-hidden (defect-do-not-port: the oracle aria-hid its icon slot)', async () => {
    const body = await render({}, { default: 'Home', leading: '<span>Home icon label</span>' });
    const leading = partElement(body, 'leading');
    expect(leading?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('size drives root density classes', async () => {
    const body = await render({ size: 'lg' }, { default: 'Wide row' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('px-4');
    expect(root.className).toContain('py-3');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'bg-card' }, { default: 'Row' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('bg-card');
  });
});
