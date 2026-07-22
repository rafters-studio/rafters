/**
 * WC performance of the sidebar score, driven end to end against light-DOM
 * markup. Same score as the React conformance test. The viewport signal is
 * mocked via matchMedia (the bind reads it live at gesture time, so no effect
 * timing is involved).
 *
 * The Escape test focuses the RAIL -- a focusable element that carries its own
 * data-part and sits INSIDE the panel -- then presses Escape. This is the exact
 * shape of the dialog-family defect #1921: `target.closest('[data-part]')` would
 * resolve to the rail and swallow the key; the bind resolves the part by
 * CONTAINMENT (`panel.contains(target)`), so Escape still dismisses.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RaftersSidebar } from '../../../src/components/sidebar/sidebar.element';

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

beforeAll(() => {
  if (!customElements.get('rafters-sidebar')) {
    customElements.define('rafters-sidebar', RaftersSidebar);
  }
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-sidebar data-part="root" data-default-open="true" data-side="left" data-collapsible="offcanvas">
      <button type="button" data-part="trigger" id="sb-trigger" aria-controls="sb-panel" data-state="expanded">Toggle</button>
      <button type="button" data-part="overlay" id="sb-overlay" aria-label="Close sidebar" data-state="closed" hidden></button>
      <nav data-part="panel" id="sb-panel" data-state="expanded" data-mobile="closed">
        <button type="button" data-part="rail" id="sb-rail" tabindex="-1" aria-label="Toggle Sidebar" data-state="expanded"></button>
        <button type="button" data-sidebar="menu-button">Dashboard</button>
      </nav>
    </rafters-sidebar>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-sidebar') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const rail = () => document.body.querySelector<HTMLElement>('[data-part="rail"]')!;
const panel = () => document.body.querySelector<HTMLElement>('[data-part="panel"]')!;
const overlay = () => document.body.querySelector<HTMLElement>('[data-part="overlay"]')!;

beforeEach(() => setViewport(false));
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  setViewport(false);
});

describe('sidebar conformance [wc]', () => {
  it('default: the rail is expanded and the scrim is hidden', async () => {
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    expect(overlay().hidden).toBe(true);
  });

  it('desktop: the trigger collapses the rail and projects the collapse mode', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('data-state')).toBe('collapsed');
    expect(panel().getAttribute('data-collapsible')).toBe('offcanvas');
  });

  it('desktop: the rail toggles the expand axis', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(rail());
    expect(panel().getAttribute('data-state')).toBe('collapsed');
  });

  it('mobile: the trigger reveals the overlay and unhides the scrim', async () => {
    const user = userEvent.setup();
    setViewport(true);
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('data-mobile')).toBe('open');
    expect(overlay().hidden).toBe(false);
    expect(panel().getAttribute('data-state')).toBe('expanded');
  });

  it('mobile: clicking the scrim dismisses the overlay', async () => {
    const user = userEvent.setup();
    setViewport(true);
    await mount();
    await user.click(trigger());
    await user.click(overlay());
    expect(panel().getAttribute('data-mobile')).toBe('closed');
    expect(overlay().hidden).toBe(true);
  });

  it('mobile: Escape resolves the panel by CONTAINMENT even from a data-part descendant', async () => {
    const user = userEvent.setup();
    setViewport(true);
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('data-mobile')).toBe('open');

    // Focus the rail (its own data-part, inside the panel), then Escape.
    rail().focus();
    await user.keyboard('{Escape}');
    expect(panel().getAttribute('data-mobile')).toBe('closed');
    expect(document.activeElement).toBe(trigger());
  });

  it('Cmd/Ctrl+B toggles the desktop expand axis', async () => {
    const user = userEvent.setup();
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    await user.keyboard('{Control>}b{/Control}');
    expect(panel().getAttribute('data-state')).toBe('collapsed');
  });
});
