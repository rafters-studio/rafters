import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Label from '../../../src/components/label/label.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown>,
  slot = 'Email address',
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Label, {
    props,
    slots: { default: slot },
  });
  // A label is never itself a landmark; realistic documents always nest it
  // inside one (a form-bearing region), so the fixture wraps it in <main>
  // for axe's landmark-coverage check rather than testing an orphan label.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('label conformance [astro]', () => {
  it('renders a native label element as the root part', async () => {
    const body = await render({ for: 'email' });
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('label');
  });

  it('for/id association: the for prop forwards as the native for attribute', async () => {
    const body = await render({ for: 'email' }, 'Email address');
    body
      .querySelector('main')
      ?.insertAdjacentHTML('beforeend', '<input id="email" type="email" />');
    const root = partElement(body, 'root');
    expect(root?.getAttribute('for')).toBe('email');
    await assertAxeClean(body);
  });

  it('default variant carries the foreground text token', async () => {
    const body = await render({});
    const root = partElement(body, 'root');
    expect(root?.className).toContain('text-foreground');
  });

  it('variant selects a token color, never a raw utility', async () => {
    const body = await render({ variant: 'destructive' });
    const root = partElement(body, 'root');
    expect(root?.className).toContain('text-destructive');
    expect(root?.className).not.toContain('text-foreground');
  });

  it('peer-disabled styling is always declared -- it activates off a sibling input, not a prop', async () => {
    const body = await render({});
    const root = partElement(body, 'root');
    expect(root?.className).toContain('peer-disabled:cursor-not-allowed');
    expect(root?.className).toContain('peer-disabled:opacity-70');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'mb-2' });
    const root = partElement(body, 'root');
    expect(root?.className).toContain('text-label-medium');
    expect(root?.className).toContain('mb-2');
  });

  it('slotted text renders as the label content', async () => {
    const body = await render({}, 'Email address');
    const root = partElement(body, 'root');
    expect(root?.textContent).toBe('Email address');
  });

  it('axe clean: descriptive label with no control association', async () => {
    const body = await render({});
    await assertAxeClean(body);
  });
});
