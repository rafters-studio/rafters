/**
 * Kbd conformance [astro] -- container's standalone AstroContainer pattern
 * (kbd has no shared adapter suite, no react performance in this scope, and
 * no behavior spec to run assertContractFulfillment against: kbd projects
 * no aria of its own, the native <kbd> semantics ARE the contract).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Kbd from '../../../src/components/kbd/kbd.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}, slot = 'Ctrl'): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Kbd, {
    props,
    slots: { default: slot },
  });
  // Kbd is inline content, not a landmark: axe's region rule wants content
  // contained by one, same as grid's <main> wrapper (grid.astro.conformance
  // .test.ts) -- real usage nests kbd inside prose/menus that already carry
  // one, this scaffold does not.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('kbd conformance [astro]', () => {
  it('renders a semantic <kbd> carrying the root part', async () => {
    const body = await render();
    const root = partElement(body, 'root');
    expect(root?.tagName.toLowerCase()).toBe('kbd');
    await assertAxeClean(body);
  });

  it('slot content renders inside the kbd', async () => {
    const body = await render({}, 'Cmd');
    const root = partElement(body, 'root');
    expect(root?.textContent).toBe('Cmd');
  });

  it('carries the fixed token decoration -- border, muted fill, code-small text', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('text-muted-foreground');
    expect(root.className).toContain('text-code-small');
    expect(root.className).toContain('border-border');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'ml-1' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('ml-1');
    expect(root.className).toContain('bg-muted');
  });

  it('passthrough attributes reach the root element', async () => {
    const body = await render({ 'aria-label': 'Command' }, '⌘');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Command');
    await assertAxeClean(body);
  });
});
