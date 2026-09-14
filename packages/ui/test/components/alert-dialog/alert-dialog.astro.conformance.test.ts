/**
 * Astro performance of the alert-dialog score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test binds
 * bindAlertDialog directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import AlertDialog from '../../../src/components/alert-dialog/alert-dialog.astro';
import { bindAlertDialog } from '../../../src/components/alert-dialog/alert-dialog.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(AlertDialog, { props: { id: 'a', ...props }, slots });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-alert-dialog') as HTMLElement;
  bindAlertDialog(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const cancel = () => document.body.querySelector<HTMLElement>('[data-part="cancel"]')!;

describe('alert-dialog conformance [astro]', () => {
  it('SSR closed: content hidden and crawlable, trigger collapsed', async () => {
    await mount({ title: 'Are you sure?' });
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR content is an alertdialog, always modal; aria wired by real ids', async () => {
    await mount({ title: 'Are you sure?' });
    expect(content().getAttribute('role')).toBe('alertdialog');
    expect(content().getAttribute('aria-modal')).toBe('true');
    expect(content().getAttribute('aria-labelledby')).toBe('a-title');
  });

  it('omitted description projects no aria-describedby', async () => {
    await mount({ title: 'Are you sure?' });
    expect(content().hasAttribute('aria-describedby')).toBe(false);
  });

  it('bind: trigger opens, focus lands on Cancel, scroll locked; Escape closes + restores focus', async () => {
    const user = userEvent.setup();
    await mount({ title: 'Are you sure?' });
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(cancel());
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('an outside pointerdown does NOT dismiss', async () => {
    const user = userEvent.setup();
    await mount({ title: 'Are you sure?' });
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(false);
  });
});
