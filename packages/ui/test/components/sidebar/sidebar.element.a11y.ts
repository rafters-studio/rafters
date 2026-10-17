import { afterEach, expect, test } from 'vitest';
import userEvent from '@testing-library/user-event';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/sidebar/sidebar.element';
import {
  sidebarClasses,
  sidebarPanelClasses,
} from '../../../src/components/sidebar/sidebar.classes';

const realMatchMedia = window.matchMedia;
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
afterEach(() => {
  window.matchMedia = realMatchMedia;
  document.body.innerHTML = '';
});

async function mount(): Promise<HTMLElement> {
  const classes = sidebarClasses();
  document.body.innerHTML = `<main><rafters-sidebar data-part="root" data-side="left" data-variant="sidebar" data-collapsible="icon" data-default-open="true" class="${classes.provider}">
  <button type="button" id="sb-trigger" data-part="trigger" class="${classes.trigger}">Toggle Sidebar</button>
  <div id="sb-dialog" data-part="dialog" class="contents">
    <nav id="sb-panel" data-part="panel" data-side="left" data-variant="sidebar" tabindex="-1" aria-label="Main" class="${sidebarPanelClasses('left', 'sidebar')}">
      <button type="button" id="sb-rail" data-part="rail" tabindex="-1" title="Toggle Sidebar" class="${classes.rail}"></button>
      <a href="/dashboard" data-sidebar="menu-button"><svg slot="start-icon" width="16" height="16"></svg>Dashboard</a>
    </nav>
  </div>
</rafters-sidebar></main>`;
  await Promise.resolve();
  const el = document.querySelector('rafters-sidebar');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-sidebar did not mount');
  return el;
}

async function clickTrigger(el: HTMLElement): Promise<void> {
  const trigger = el.querySelector('[data-part="trigger"]');
  if (!(trigger instanceof HTMLElement)) throw new Error('no trigger part');
  await userEvent.click(trigger);
}

test('sidebar.element desktop expanded has no axe violations', async ({ task }) => {
  setViewport(false);
  await mount();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('sidebar.element desktop collapsed has no axe violations', async ({ task }) => {
  setViewport(false);
  await clickTrigger(await mount());
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('sidebar.element mobile open has no axe violations', async ({ task }) => {
  setViewport(true);
  await clickTrigger(await mount());
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
