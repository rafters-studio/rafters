/**
 * Astro performance of the dialog score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindDialog directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Dialog from '../../../src/components/dialog/dialog.astro';
import { bindDialog } from '../../../src/components/dialog/dialog.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Dialog, { props: { id: 'd', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-dialog') as HTMLElement;
  bindDialog(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('dialog conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed', async () => {
    await mount({ title: 'Settings' });
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR wires aria by real ids; omitted description projects none', async () => {
    await mount({ title: 'Settings' });
    expect(content().getAttribute('aria-labelledby')).toBe('d-title');
    expect(content().hasAttribute('aria-describedby')).toBe(false);
  });

  it('bind: trigger opens, focus trapped, scroll locked; Escape closes + restores focus', async () => {
    const user = userEvent.setup();
    await mount({ title: 'Settings' }, { default: '<button type="button">Save</button>' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
