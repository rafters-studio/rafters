/**
 * Astro performance of the sidebar score, driven end to end. AstroContainer
 * renders the SSR markup but does NOT run the <script>, so the test calls
 * bindSidebar directly -- that IS the script's job -- then drives the same score
 * the React and WC performances drive. The viewport signal is mocked via
 * matchMedia (read live by the bind).
 *
 * The mobile overlay is the SSR panel (a `<nav>`) rendered inside a `dialog`
 * wrapper `<div>`; the bind puts the modal identity (role=dialog + the sheet
 * modal trio) on that WRAPPER, never on the `<nav>` (role=dialog is not an
 * allowed ARIA role on `<nav>` -- axe `aria-allowed-role`, #2338/#2222). A
 * closed mobile overlay `hidden`s the panel so its links leave the tab order
 * and a11y tree.
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

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sidebar, {
    props: { id: 'sb', ...props },
    slots: { default: '<a href="/dashboard" data-sidebar="menu-button">Dashboard</a>' },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-sidebar') as HTMLElement;
  bindSidebar(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const rail = () => document.body.querySelector<HTMLElement>('[data-part="rail"]')!;
const panel = () => document.body.querySelector<HTMLElement>('[data-part="panel"]')!;
const dialog = () => document.body.querySelector<HTMLElement>('[data-part="dialog"]')!;

beforeEach(() => setViewport(false));
afterEach(() => {
  document.body.innerHTML = '';
  setViewport(false);
});

describe('sidebar conformance [astro]', () => {
  it('SSR default: expanded rail, present and navigable, wired to the panel by real id', async () => {
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    expect(panel().hidden).toBe(false);
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

  it('bind mobile: a CLOSED overlay hides the panel so its links are unreachable', async () => {
    setViewport(true);
    await mount();
    expect(panel().hidden).toBe(true);
  });

  it('bind mobile: the trigger opens a modal dialog on the wrapper, never the nav; Escape from a data-part descendant dismisses', async () => {
    setViewport(true);
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(panel().hidden).toBe(false);
    // role=dialog is not an allowed ARIA role on <nav> (axe aria-allowed-role,
    // #2338/#2222) -- the dialog identity lives on the wrapper, never the panel.
    expect(dialog().getAttribute('role')).toBe('dialog');
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(dialog().getAttribute('aria-label')).toBe('Sidebar');
    expect(panel().tagName).toBe('NAV');
    expect(panel().hasAttribute('role')).toBe(false);
    expect(panel().hasAttribute('aria-modal')).toBe(false);
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    // Containment resolution: focus the rail (its own data-part, inside the
    // panel) then Escape -- it must still dismiss and restore focus.
    rail().focus();
    await user.keyboard('{Escape}');
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
