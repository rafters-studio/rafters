/**
 * Astro performance of the popover score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindPopover directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Popover from '../../../src/components/popover/popover.astro';
import { bindPopover } from '../../../src/components/popover/popover.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Popover, { props: { id: 'p', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-popover') as HTMLElement;
  bindPopover(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('popover conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed with haspopup dialog', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(content().getAttribute('role')).toBe('dialog');
  });

  it('bind: trigger opens, focus moves in, aria wired; Escape closes', async () => {
    const user = userEvent.setup();
    await mount({}, { default: '<button type="button">Action</button>' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-controls')).toBe('p-content');
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).not.toBe('hidden');
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });

  it('close button dismisses the panel', async () => {
    const user = userEvent.setup();
    await mount({ showClose: true }, { default: '<button type="button">Action</button>' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(document.body.querySelector('[data-part="close"]') as HTMLElement);
    expect(content().hidden).toBe(true);
  });
});
