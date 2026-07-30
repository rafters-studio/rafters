/**
 * Astro performance of the Alert score. The SAME score as the React
 * conformance test -- Alert is a static, so the role/variant projection is a
 * pure function of config and its Astro file ships NO <script>, no bindAlert.
 * This test renders the server markup and asserts the contract a banner
 * carries: the root part with the score's projected role, the variant classes
 * coming from the shared projection, the named-slot structure, and axe
 * cleanliness.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Alert from '../../../src/components/alert/alert.astro';
import { alert } from '../../../src/components/alert/alert.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Alert, { props, slots });
  // A banner is content inside a page, not a landmark of its own; the page
  // around it supplies the region so axe's best-practice `region` rule holds.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('alert conformance [astro]', () => {
  it('fulfills the contract: root renders and carries the projected role=alert', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root).not.toBeNull();
    assertContractFulfillment(alert, root, {}, {}, ['root']);
  });

  it('projects role=alert regardless of variant', async () => {
    const root = partElement(await render({ variant: 'destructive' }), 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('alert');
  });

  it('renders the shared base classes on the root', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full rounded-lg');
    expect(root.className).toContain('border');
    expect(root.className).toContain('p-4');
  });

  it('variant selects the subtle triple through the same class projection', async () => {
    const root = partElement(await render({ variant: 'success' }), 'root') as HTMLElement;
    expect(root.className).toContain('bg-success-subtle');
    expect(root.className).toContain('text-success-subtle-foreground');
    expect(root.className).toContain('border-success-border');
    expect(root.className).not.toContain('bg-primary-subtle');
  });

  it('an unspecified variant falls back to default, like React', async () => {
    const root = partElement(await render(), 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary-subtle');
  });

  it('consumer class merges onto the root', async () => {
    const root = partElement(await render({ class: 'mt-4' }), 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full rounded-lg');
    expect(root.className).toContain('mt-4');
  });

  it('root is the only declared part -- sub-wrappers carry classes, not data-part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('exposes title/description/action regions with the shared data-slot markers', async () => {
    const body = await render();
    expect(body.querySelector('[data-slot="alert-title"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="alert-description"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="alert-action"]')).not.toBeNull();
  });

  it('slotted content projects into its region', async () => {
    const body = await render(
      { variant: 'success' },
      {
        title: 'Saved',
        description: 'Your changes were saved.',
        action: '<button type="button">Undo</button>',
      },
    );
    expect((body.querySelector('[data-slot="alert-title"]') as HTMLElement).textContent).toContain(
      'Saved',
    );
    expect(
      (body.querySelector('[data-slot="alert-description"]') as HTMLElement).textContent,
    ).toContain('Your changes were saved.');
    expect(body.querySelector('[data-slot="alert-action"] button')?.textContent).toBe('Undo');
  });

  it('default-slot content lands as a direct child of the root, where the icon selectors reach it', async () => {
    const body = await render({}, { default: '<svg aria-hidden="true"></svg>' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.querySelector(':scope > svg')).not.toBeNull();
  });

  it('is axe-clean composed with title, description, and an action control', async () => {
    const body = await render(
      { variant: 'success' },
      {
        title: 'Saved',
        description: 'Your changes were saved.',
        action: '<button type="button">Undo</button>',
      },
    );
    await assertAxeClean(body);
  });

  it('is axe-clean with every region empty -- no empty heading left behind', async () => {
    await assertAxeClean(await render());
  });
});
