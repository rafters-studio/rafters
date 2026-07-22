/**
 * Astro performance of the sidebar score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test calls
 * bindSidebar directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive. The viewport signal is mocked via
 * matchMedia (read live at gesture time by the bind).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Sidebar from '../../../src/components/sidebar/sidebar.astro';
import { bindSidebar } from '../../../src/components/sidebar/sidebar.behavior';

function setViewport(isMobile: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sidebar, {
    props: { id: 'sb', ...props },
    slots: { default: '<a href="/dashboard" data-sidebar="menu-button">Dashboard</a>', ...slots },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-sidebar') as HTMLElement;
  bindSidebar(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const rail = () => document.body.querySelector<HTMLElement>('[data-part="rail"]')!;
const panel = () => document.body.querySelector<HTMLElement>('[data-part="panel"]')!;
const overlay = () => document.body.querySelector<HTMLElement>('[data-part="overlay"]')!;

beforeEach(() => setViewport(false));
afterEach(() => {
  document.body.innerHTML = '';
  setViewport(false);
});

describe('sidebar conformance [astro]', () => {
  it('SSR default: expanded rail, scrim hidden and crawlable', async () => {
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    expect(panel().getAttribute('data-mobile')).toBe('closed');
    expect(overlay().hidden).toBe(true);
  });

  it('SSR wires the trigger to the panel by real id', async () => {
    await mount();
    expect(trigger().getAttribute('aria-controls')).toBe(panel().id);
    expect(panel().id).toBe('sb-panel');
  });

  it('bind: the trigger collapses the rail on the desktop viewport', async () => {
    const user = userEvent.setup();
    await mount({ collapsible: 'icon' });
    await user.click(trigger());
    expect(panel().getAttribute('data-state')).toBe('collapsed');
    expect(panel().getAttribute('data-collapsible')).toBe('icon');
  });

  it('bind mobile: the trigger reveals the overlay; Escape from a data-part descendant dismisses', async () => {
    const user = userEvent.setup();
    setViewport(true);
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('data-mobile')).toBe('open');
    expect(overlay().hidden).toBe(false);

    // Containment resolution: focus the rail (its own data-part, inside the
    // panel) then Escape -- it must still dismiss and restore focus.
    rail().focus();
    await user.keyboard('{Escape}');
    expect(panel().getAttribute('data-mobile')).toBe('closed');
    expect(document.activeElement).toBe(trigger());
  });
});
