/**
 * Astro performance of the sheet score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindSheet directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Sheet from '../../../src/components/sheet/sheet.astro';
import { bindSheet } from '../../../src/components/sheet/sheet.behavior';
import { sheetSideClasses } from '../../../src/components/sheet/sheet.classes';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sheet, { props: { id: 's', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-sheet') as HTMLElement;
  bindSheet(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

describe('sheet conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed', async () => {
    await mount({ title: 'Filters' });
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR wires aria by real ids; omitted description projects none', async () => {
    await mount({ title: 'Filters' });
    expect(content().getAttribute('aria-labelledby')).toBe('s-title');
    expect(content().hasAttribute('aria-describedby')).toBe(false);
  });

  it('SSR renders the requested side variant; default is right', async () => {
    await mount({ title: 'Filters', side: 'left' });
    expect(content().getAttribute('data-side')).toBe('left');
    expect(content().className).toContain(sheetSideClasses.left);

    await mount({ title: 'Filters' });
    expect(content().getAttribute('data-side')).toBe('right');
    expect(content().className).toContain(sheetSideClasses.right);
  });

  it('bind: trigger opens, focus trapped, scroll locked; Escape closes + restores focus', async () => {
    const user = userEvent.setup();
    await mount({ title: 'Filters' }, { default: '<button type="button">Apply</button>' });
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
