/**
 * Astro performance of the hover-card score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindHoverCard directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive.
 *
 * The SSR half is the interesting one at #2148: the server HTML must already be
 * a correct, JS-off hover card. Content present, never `hidden`, described
 * unconditionally, and carrying the class candidates the stylesheet reveals it
 * through -- including the `linger` this component alone closes on.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import HoverCard from '../../../src/components/hover-card/hover-card.astro';
import { bindHoverCard } from '../../../src/components/hover-card/hover-card.behavior';
import { assertConfigTravelsAsData } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(HoverCard, {
    props: { id: 'hc', href: '/user/john', label: 'John Doe', ...props },
    slots: { default: '@john', content: '<span>Software Engineer</span>' },
  });
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  document.body.innerHTML = await render(props);
  const root = document.body.querySelector('[data-part="root"][data-hover-card]') as HTMLElement;
  bindHoverCard(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const state = () => content().dataset['state'];

describe('hover-card conformance [astro]', () => {
  it('SSR closed: content present, crawlable, described, named, never hidden', async () => {
    document.body.innerHTML = await render();
    expect(content().textContent).toContain('Software Engineer');
    expect(content().getAttribute('role')).toBe('dialog');
    expect(content().getAttribute('aria-label')).toBe('John Doe');
    expect(content().hidden).toBe(false);
    // Ids are minted `${id}-${part}`; assert the SHAPE, not a literal.
    expect(trigger().getAttribute('aria-describedby')).toBe(content().id);
  });

  it('SSR carries BOTH cells: hover-intent on open, linger on close', async () => {
    const html = await render();
    expect(html).toMatch(/delay-hover-intent/);
    // Hover-card is the one component of the three whose close carries a delay.
    expect(html).toMatch(/delay-linger/);
  });

  it('SSR renders no timing literal and no delay config attribute', async () => {
    const html = await render();
    expect(html).not.toContain('data-open-delay');
    expect(html).not.toContain('data-close-delay');
    // Attribute position only: `overflow-hidden` and friends are classes.
    expect(html).not.toMatch(/\shidden(=|>|\s|$)/);
  });

  it('bind: hover opens and leaving closes, on data-state', async () => {
    const user = userEvent.setup();
    const root = await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    expect(trigger().getAttribute('aria-describedby')).toBe('hc-content');
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
  // <rafters-hover-card> used as a query hook. #2001: its config is data-* only.
  it('root is a semantic, unclassed div and config crosses the seam as data-* only', async () => {
    const root = await mount({ side: 'top', align: 'start', sideOffset: 0 });
    expect(root.tagName).toBe('DIV');
    // No class, ever: a behavior root is a binding host, not a box, and it
    // never styles itself (operator ruling, 2026-08-02). Layout is Container's.
    expect(root.hasAttribute('class')).toBe(false);
    expect(root.hasAttribute('data-hover-card')).toBe(true);

    assertConfigTravelsAsData(root, {
      disableHoverableContent: 'false',
      defaultOpen: 'false',
      side: 'top',
      align: 'start',
      sideOffset: '0',
    });
  });

  it('rehydration: bindHoverCard reconstructs defaultOpen from dataset alone', async () => {
    const root = await mount({ defaultOpen: true });
    expect(root.dataset['defaultOpen']).toBe('true');
    // Erase the SSR open projection, then re-bind: only data-default-open, read
    // through dataset, can bring it back.
    content().removeAttribute('data-state');
    bindHoverCard(root);
    expect(state()).toBe('open');
  });
});
