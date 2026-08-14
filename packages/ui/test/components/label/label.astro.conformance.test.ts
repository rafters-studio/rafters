/**
 * Astro performance of the Label score. Label is a PURE STATIC -- the score
 * projects no ARIA, holds no state, runs no effects -- so its Astro file ships
 * NO <script> and there is NO bindLabel. This test renders the server markup
 * and asserts the one contract a static label can carry: the root <label>, the
 * shared classes, the native `for` pass-through, and axe cleanliness. One
 * score, three performances; here the performance is markup + classes + slot.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Label from '../../../src/components/label/label.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Label, { props, slots });
  document.body.innerHTML = html;
  return document.body;
}

describe('label conformance [astro]', () => {
  it('renders a root <label> part carrying the shared classes', async () => {
    const body = await render({}, { default: 'Email' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('label');
    expect(root.className).toContain('ts-label-medium');
    expect(root.className).toContain('text-foreground');
  });

  it('projects NO ARIA: the root is a pure static label (no role)', async () => {
    const body = await render({}, { default: 'Email' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const body = await render({}, { default: 'Email' });
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('variant selects the semantic colour role token', async () => {
    const body = await render({ variant: 'destructive' }, { default: 'Required' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('text-destructive');
  });

  it('the native `for` association attribute passes straight through', async () => {
    const body = await render({ for: 'email' }, { default: 'Email' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('for')).toBe('email');
  });

  it('slotted content projects into the label', async () => {
    const body = await render({}, { default: 'Email address' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.textContent).toContain('Email address');
  });

  it('is axe-clean when associated with a control', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: { for: 'email' },
      slots: { default: 'Email address' },
    });
    // The label associates by id with a light-DOM control, inside a landmark so
    // the axe best-practice `region` rule is satisfied by the page.
    document.body.innerHTML = `<main>${html}<input id="email" type="email" /></main>`;
    await assertAxeClean(document.body);
  });
});
