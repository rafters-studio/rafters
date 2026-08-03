/**
 * Astro performance of the hover-card score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindHoverCard directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. Delays are zeroed so hover intent
 * resolves synchronously.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import HoverCard from '../../../src/components/hover-card/hover-card.astro';
import { bindHoverCard } from '../../../src/components/hover-card/hover-card.behavior';
import { resetHoverDelayState } from '../../../src/primitives/hover-delay';
import { assertConfigTravelsAsData } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
  resetHoverDelayState();
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HoverCard, {
    props: {
      id: 'hc',
      href: '/user/john',
      label: 'John Doe',
      openDelay: 0,
      closeDelay: 0,
      ...props,
    },
    slots: { default: '@john', content: '<span>Software Engineer</span>' },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"][data-hover-card]') as HTMLElement;
  bindHoverCard(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('hover-card conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger undescribed, named dialog', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(content().textContent).toContain('Software Engineer');
    expect(trigger().hasAttribute('aria-describedby')).toBe(false);
    expect(content().getAttribute('role')).toBe('dialog');
    expect(content().getAttribute('aria-label')).toBe('John Doe');
  });

  it('bind: hover opens and wires aria; leaving closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-describedby')).toBe('hc-content');
    await user.unhover(trigger());
    expect(content().hidden).toBe(true);
  });

  it('bind: Escape dismisses while the trigger is focused', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
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
      openDelay: '0',
      closeDelay: '0',
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
    // Erase the SSR open projection AND the content's data-state fallback, then
    // re-bind: only data-default-open, read through dataset, can bring it back.
    const card = content();
    card.removeAttribute('data-state');
    card.hidden = true;
    bindHoverCard(root);
    expect(card.hidden).toBe(false);
  });
});
