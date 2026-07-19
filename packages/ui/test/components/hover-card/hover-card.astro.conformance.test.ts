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
  const root = document.body.querySelector('rafters-hover-card') as HTMLElement;
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
});
