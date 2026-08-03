/**
 * Astro performance of the drawer score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindDrawer directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Drawer from '../../../src/components/drawer/drawer.astro';
import { bindDrawer } from '../../../src/components/drawer/drawer.behavior';
import { assertConfigTravelsAsData } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Drawer, { props: { id: 'dr', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"][data-drawer]') as HTMLElement;
  bindDrawer(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('drawer conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed', async () => {
    await mount({ title: 'Actions' });
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR wires aria by real ids; omitted description projects none', async () => {
    await mount({ title: 'Actions' });
    expect(content().getAttribute('aria-labelledby')).toBe('dr-title');
    expect(content().hasAttribute('aria-describedby')).toBe(false);
  });

  it('SSR anchors to the configured edge without disturbing the dialog role', async () => {
    await mount({ title: 'Actions', side: 'right' });
    expect(content().getAttribute('role')).toBe('dialog');
    expect(content().className).toContain('right-0');
  });

  it('Escape closes even when the close button holds the trap initial focus', async () => {
    // Regression: with no default-slot content, the close button is the only
    // focusable descendant, so the focus-trap gives it initial focus. A
    // target-scoped keymap would classify Escape as `close` and drop it; the
    // bind resolves any keydown inside content as content-scoped.
    const user = userEvent.setup();
    await mount({ title: 'Actions' });
    await user.click(trigger());
    const close = document.body.querySelector<HTMLElement>('[data-part="close"]')!;
    expect(document.activeElement).toBe(close);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('bind: trigger opens, focus trapped, scroll locked; Escape closes + restores focus', async () => {
    const user = userEvent.setup();
    await mount({ title: 'Actions' }, { default: '<button type="button">Save</button>' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  // #2004: the root is a real, semantic element, not an unregistered
  // <rafters-drawer> used as a query hook. #2001: its config is data-* only.
  it('root is a semantic, unclassed div and config crosses the seam as data-* only', async () => {
    const root = await mount({ title: 'Actions', modal: false, side: 'right' });
    expect(root.tagName).toBe('DIV');
    // No class, ever: a behavior root is a binding host, not a box, and it
    // never styles itself (operator ruling, 2026-08-02). Layout is Container's.
    expect(root.hasAttribute('class')).toBe(false);
    expect(root.hasAttribute('data-drawer')).toBe(true);

    assertConfigTravelsAsData(root, {
      modal: 'false',
      defaultOpen: 'false',
      side: 'right',
    });
  });

  it('rehydration: bindDrawer reconstructs defaultOpen from dataset alone', async () => {
    const root = await mount({ title: 'Actions', defaultOpen: true });
    expect(root.dataset['defaultOpen']).toBe('true');
    // Erase the SSR open projection AND the content's data-state fallback, then
    // re-bind: only data-default-open, read through dataset, can bring it back.
    const panel = content();
    panel.removeAttribute('data-state');
    panel.hidden = true;
    bindDrawer(root);
    expect(panel.hidden).toBe(false);
  });
});
