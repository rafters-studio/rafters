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
import { afterEach, describe, expect, it, vi } from 'vitest';
import AlertAction from '../../../src/components/alert/alert-action.astro';
import AlertDescription from '../../../src/components/alert/alert-description.astro';
import AlertTitle from '../../../src/components/alert/alert-title.astro';
import Alert from '../../../src/components/alert/alert.astro';
import { alert } from '../../../src/components/alert/alert.behavior';
import {
  alertActionClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from '../../../src/components/alert/alert.classes';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

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

/** Render an arbitrary Astro component in isolation -- used for the drop-in
 *  part files, which are not the Alert root. */
async function renderOne(
  Component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, { props, slots });
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

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const root = partElement(await render({ class: 'mt-4' }), 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full rounded-lg');
    expect(root.className).not.toContain('mt-4');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('root is the only declared part -- sub-wrappers carry classes, not data-part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('exposes title/description/action regions with the shared data-slot markers when slotted', async () => {
    const body = await render({}, { title: 'x', description: 'y', action: 'z' });
    expect(body.querySelector('[data-slot="alert-title"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="alert-description"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="alert-action"]')).not.toBeNull();
  });

  it('renders no phantom title/description/action regions when no named slot is filled', async () => {
    // Astro.slots.has guards these regions (alert.astro, matching
    // card.astro:109-112) so an unfilled named slot leaves no empty wrapper --
    // the collision the guard exists to prevent once the part files below
    // compose through the default slot instead.
    const body = await render();
    expect(body.querySelectorAll('[data-slot="alert-title"]')).toHaveLength(0);
    expect(body.querySelectorAll('[data-slot="alert-description"]')).toHaveLength(0);
    expect(body.querySelectorAll('[data-slot="alert-action"]')).toHaveLength(0);
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
});

/**
 * Astro's compiler numeric-escapes a literal `&` inside an attribute value
 * (`&` -> `&#38;`), which is spec-correct markup; this reads the attribute
 * back the way a parser that fully decoded it would, so the comparison is
 * against the class STRING, not against a markup-serialization detail.
 */
function readClass(element: HTMLElement): string | null {
  return element.getAttribute('class')?.replace(/&#38;/g, '&') ?? null;
}

describe('alert astro part files [parity surface]', () => {
  it('AlertTitle renders an h5 with the shared title class string', async () => {
    const body = await renderOne(AlertTitle, {}, { default: 'Error' });
    const title = body.querySelector('[data-slot="alert-title"]') as HTMLElement;
    expect(title).not.toBeNull();
    expect(title.tagName).toBe('H5');
    expect(readClass(title)).toBe(alertTitleClasses);
    expect(title.textContent?.trim()).toBe('Error');
  });

  it('AlertDescription renders a div with the shared description class string', async () => {
    const body = await renderOne(AlertDescription, {}, { default: 'Your changes were saved.' });
    const description = body.querySelector('[data-slot="alert-description"]') as HTMLElement;
    expect(description).not.toBeNull();
    expect(description.tagName).toBe('DIV');
    expect(readClass(description)).toBe(alertDescriptionClasses);
    expect(description.textContent?.trim()).toBe('Your changes were saved.');
  });

  it('AlertAction renders a div with the shared action class string', async () => {
    const body = await renderOne(
      AlertAction,
      {},
      { default: '<button type="button">Undo</button>' },
    );
    const action = body.querySelector('[data-slot="alert-action"]') as HTMLElement;
    expect(action).not.toBeNull();
    expect(action.tagName).toBe('DIV');
    expect(readClass(action)).toBe(alertActionClasses);
    expect(action.querySelector('button')?.textContent).toBe('Undo');
  });

  it('class is NOT a prop on any part file -- it never reaches the element, silently', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    for (const [Component, slot, expectedClass] of [
      [AlertTitle, 'alert-title', alertTitleClasses],
      [AlertDescription, 'alert-description', alertDescriptionClasses],
      [AlertAction, 'alert-action', alertActionClasses],
    ] as const) {
      const body = await renderOne(Component, { class: 'bg-red-500' }, { default: 'x' });
      const el = body.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      expect(el, slot).not.toBeNull();
      expect(readClass(el), slot).toBe(expectedClass);
      expect(readClass(el), slot).not.toContain('bg-red-500');
    }
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('composes into an Alert exactly like the React tree, node for node -- slot, tag, and class', async () => {
    const container = await AstroContainer.create();
    const title = await container.renderToString(AlertTitle, { slots: { default: 'Saved' } });
    const description = await container.renderToString(AlertDescription, {
      slots: { default: 'Your changes were saved.' },
    });
    const action = await container.renderToString(AlertAction, {
      slots: { default: '<button type="button">Undo</button>' },
    });
    const html = await container.renderToString(Alert, {
      props: { variant: 'destructive' },
      slots: { default: title + description + action },
    });
    document.body.innerHTML = `<main>${html}</main>`;
    const root = document.body.querySelector('[data-part="root"]') as HTMLElement;
    expect(root).not.toBeNull();

    const shape = [...root.querySelectorAll('[data-slot]')].map((node) => [
      node.getAttribute('data-slot'),
      node.tagName.toLowerCase(),
      readClass(node as HTMLElement),
    ]);
    // The same sequence, tags, and classes the React tree asserts
    // (alert.conformance.test.tsx: "sub-components carry data-slot markers
    // matching Astro/WC"), read off the SAME alert.classes.ts constants --
    // one score, no drift.
    expect(shape).toEqual([
      ['alert-title', 'h5', alertTitleClasses],
      ['alert-description', 'div', alertDescriptionClasses],
      ['alert-action', 'div', alertActionClasses],
    ]);

    // No phantom named-slot wrapper collides with the composed nodes.
    expect(root.querySelectorAll('[data-slot="alert-title"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-slot="alert-description"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-slot="alert-action"]')).toHaveLength(1);
    expect(root.querySelector('button')?.textContent).toBe('Undo');
  });
});
