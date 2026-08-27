/**
 * Astro performance of the tooltip score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindTooltip directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive.
 *
 * The SSR half is the interesting one at #2148: the server HTML must already be
 * a correct, JS-off tooltip. Content present, never `hidden`, described
 * unconditionally, and carrying the class candidates the stylesheet reveals it
 * through. Nothing about timing reaches the markup any more -- there is no
 * delay attribute to render.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Tooltip from '../../../src/components/tooltip/tooltip.astro';
import { bindTooltip } from '../../../src/components/tooltip/tooltip.behavior';
import { assertConfigTravelsAsData } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Tooltip, {
    props: { id: 't', content: 'More info', ...props },
    slots: { default: 'Help' },
  });
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  document.body.innerHTML = await render(props);
  const root = document.body.querySelector('[data-part="root"][data-tooltip]') as HTMLElement;
  bindTooltip(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const state = () => content().dataset['state'];

describe('tooltip conformance [astro]', () => {
  it('SSR closed: content present, crawlable, described, and never hidden', async () => {
    const html = await render();
    document.body.innerHTML = html;
    expect(content().textContent).toContain('More info');
    expect(content().getAttribute('role')).toBe('tooltip');
    expect(content().hidden).toBe(false);
    // `hidden` is UA display:none -- it would take the tip out of the a11y tree
    // and out of reach of the hover reveal, before any JavaScript runs.
    // Attribute position only: `overflow-hidden` is a class, not the attribute.
    expect(html).not.toMatch(/\shidden(=|>|\s|$)/);
    // Ids are minted `${id}-${part}`; assert the SHAPE, not a literal.
    expect(trigger().getAttribute('aria-describedby')).toBe(content().id);
  });

  it('SSR carries the open delay and NO linger: tooltip closes immediately', async () => {
    const html = await render();
    // The open cell's delay reaches the page as a class candidate...
    expect(html).toMatch(/delay-hover-intent/);
    // ...and the close cell carries no delay generic at all, per motion.jsonl.
    expect(html).not.toMatch(/delay-linger/);
    expect(html).not.toMatch(/delay-skip/);
  });

  it('SSR renders no timing literal and no delay config attribute', async () => {
    const html = await render();
    expect(html).not.toContain('data-delay-duration');
    expect(html).not.toContain('data-skip-delay-duration');
  });

  it('bind: hover opens and leaving closes, on data-state', async () => {
    const user = userEvent.setup();
    const root = await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    expect(trigger().getAttribute('aria-describedby')).toBe('t-content');
    await user.unhover(root);
    expect(state()).toBe('closed');
  });

  it('bind: Escape dismisses while the trigger is focused', async () => {
    const user = userEvent.setup();
    const root = await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(state()).toBe('open');
    await user.keyboard('{Escape}');
    expect(state()).toBe('closed');
    expect(root.dataset['dismissed']).toBe('true');
  });

  // #2004: the root is a real, semantic element, not an unregistered
  // <rafters-tooltip> used as a query hook. #2001: its config is data-* only.
  it('root is a semantic, unclassed div and config crosses the seam as data-* only', async () => {
    const root = await mount({ side: 'top', align: 'start', sideOffset: 0 });
    expect(root.tagName).toBe('DIV');
    // No class, ever: a behavior root is a binding host, not a box, and it
    // never styles itself (operator ruling, 2026-08-02). Layout is Container's.
    expect(root.hasAttribute('class')).toBe(false);
    expect(root.hasAttribute('data-tooltip')).toBe(true);

    assertConfigTravelsAsData(root, {
      disableHoverableContent: 'false',
      defaultOpen: 'false',
      side: 'top',
      align: 'start',
      sideOffset: '0',
    });
  });

  it('rehydration: bindTooltip reconstructs defaultOpen from dataset alone', async () => {
    const root = await mount({ defaultOpen: true });
    expect(root.dataset['defaultOpen']).toBe('true');
    // Erase the SSR open projection, then re-bind: only data-default-open, read
    // through dataset, can bring it back.
    content().removeAttribute('data-state');
    bindTooltip(root);
    expect(state()).toBe('open');
  });
});
