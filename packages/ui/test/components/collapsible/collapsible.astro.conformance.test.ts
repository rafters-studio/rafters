/**
 * Astro performance of the collapsible score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindCollapsible directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Collapsible from '../../../src/components/collapsible/collapsible.astro';
import { bindCollapsible } from '../../../src/components/collapsible/collapsible.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Collapsible, { props: { id: 'c', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-collapsible') as HTMLElement;
  bindCollapsible(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('collapsible conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
  });

  it('bind: trigger opens, aria wires to content, toggles closed again', async () => {
    const user = userEvent.setup();
    await mount({}, { default: '<p>Revealed content</p>' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('c-content');
    await user.click(trigger());
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR defaultOpen renders open and wired', async () => {
    await mount({ defaultOpen: true }, { default: '<p>Revealed content</p>' });
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('c-content');
  });
});
