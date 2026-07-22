/**
 * WC performance of the sidebar score, driven end to end against light-DOM
 * markup. Same score as the React conformance test. The viewport signal is
 * mocked via matchMedia (the bind reads it live).
 *
 * The mobile overlay is the panel enhanced IN PLACE by the bind into a modal
 * (role=dialog + the sheet modal trio), composing the merged sheet's own
 * behavior; a closed mobile overlay is `hidden` so its links leave the tab order
 * and a11y tree (WCAG 2.2 AAA). The Escape test focuses the RAIL -- a focusable
 * element that carries its own data-part inside the panel -- to prove the part is
 * resolved by CONTAINMENT (`panel.contains`), not `closest('[data-part]')`, the
 * dialog-family defect #1921.
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
      <nav data-part="panel" id="sb-panel" data-state="expanded" data-mobile="closed" tabindex="-1">
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

beforeEach(() => setViewport(false));
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  setViewport(false);
});

describe('sidebar conformance [wc]', () => {
  it('desktop default: the rail is expanded, present and navigable (never hidden)', async () => {
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    expect(panel().hidden).toBe(false);
    expect(panel().hasAttribute('role')).toBe(false);
  });

  it('desktop: the trigger collapses the rail and projects the collapse mode', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('data-state')).toBe('collapsed');
    expect(panel().getAttribute('data-collapsible')).toBe('offcanvas');
    expect(panel().hidden).toBe(false);
  });

  it('desktop: the rail toggles the expand axis', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(rail());
    expect(panel().getAttribute('data-state')).toBe('collapsed');
  });

  it('mobile: a CLOSED overlay hides the panel -- its links leave the tab order and a11y tree', async () => {
    setViewport(true);
    await mount();
    expect(panel().hidden).toBe(true);
    expect(panel().hasAttribute('role')).toBe(false);
  });

  it('mobile: the trigger opens a modal dialog, traps focus, and locks scroll', async () => {
    setViewport(true);
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(panel().hidden).toBe(false);
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-modal')).toBe('true');
    expect(panel().getAttribute('aria-label')).toBe('Sidebar');
    expect(panel().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('mobile: Escape resolves the panel by CONTAINMENT from a data-part descendant, closes and restores focus', async () => {
    setViewport(true);
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(panel().getAttribute('role')).toBe('dialog');

    // Focus the rail (its own data-part, inside the panel), then Escape.
    rail().focus();
    await user.keyboard('{Escape}');
    expect(panel().hidden).toBe(true);
    expect(panel().hasAttribute('role')).toBe(false);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('Cmd/Ctrl+B toggles the desktop expand axis', async () => {
    const user = userEvent.setup();
    await mount();
    expect(panel().getAttribute('data-state')).toBe('expanded');
    await user.keyboard('{Control>}b{/Control}');
    expect(panel().getAttribute('data-state')).toBe('collapsed');
  });
});
