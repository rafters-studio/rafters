import { afterEach, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import '../../../src/components/sidebar/sidebar.element';
import {
  sidebar,
  sidebarIconAria,
  type SidebarConfig,
  type SidebarPart,
  type SidebarState,
} from '../../../src/components/sidebar/sidebar.behavior';
import {
  sidebarClasses,
  sidebarMenuButtonClasses,
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

const CONFIG: SidebarConfig = {
  defaultOpen: true,
  side: 'left',
  variant: 'sidebar',
  collapsible: 'icon',
};
const IDS = Object.fromEntries(
  (Object.keys(sidebar.parts) as SidebarPart[]).map((part) => [part, `app-${part}`]),
) as Record<SidebarPart, string>;

function attrs(record: Record<string, string | boolean | undefined> | undefined): string {
  return Object.entries(record ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value)}"`)
    .join('');
}

// The light-DOM markup sidebar.astro:107-140 renders for CONFIG, with a
// consumer-authored menu button inside the nav.
function astroMarkup(): string {
  const classes = sidebarClasses();
  const aria = sidebar.aria(sidebar.initialState(CONFIG), CONFIG, IDS);
  return `<rafters-sidebar data-part="root" data-side="left" data-variant="sidebar" data-collapsible="icon" data-default-open="true" class="${classes.provider}">
  <button type="button" id="${IDS.trigger}" data-part="trigger" class="${classes.trigger}"${attrs(aria.trigger)}>Toggle Sidebar</button>
  <div id="${IDS.dialog}" data-part="dialog" class="contents">
    <nav id="${IDS.panel}" data-part="panel" data-side="left" data-variant="sidebar" tabindex="-1" class="${sidebarPanelClasses('left', 'sidebar')}"${attrs(aria.panel)}>
      <button type="button" id="${IDS.rail}" data-part="rail" tabindex="-1" title="Toggle Sidebar" class="${classes.rail}"${attrs(aria.rail)}></button>
      <button type="button" data-sidebar="menu-button" class="${sidebarMenuButtonClasses()}"><svg slot="start-icon"></svg>Dashboard</button>
    </nav>
  </div>
</rafters-sidebar>`;
}

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = astroMarkup();
  await Promise.resolve(); // the bind runs one microtask after connect
  const el = document.querySelector('rafters-sidebar');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-sidebar did not mount');
  return el;
}

function part(el: HTMLElement, name: SidebarPart): HTMLElement {
  const found = el.querySelector(`[data-part="${name}"]`);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${name} part`);
  return found;
}

function expectPerforms(el: HTMLElement, state: SidebarState): void {
  const aria = sidebar.aria(state, CONFIG, IDS);
  for (const name of ['trigger', 'rail', 'panel'] as const) {
    for (const [attr, value] of Object.entries(aria[name] ?? {})) {
      expect(part(el, name).getAttribute(attr)).toBe(value === undefined ? null : String(value));
    }
  }
  expect(part(el, 'panel').className).toBe(sidebarPanelClasses('left', 'sidebar'));
  expect(part(el, 'trigger').className).toBe(sidebarClasses().trigger);
}

it('enhances the consumer markup and toggles the desktop rail', async () => {
  setViewport(false);
  const el = await mount();
  expect(el.shadowRoot).toBeNull();
  expectPerforms(el, { open: true, openMobile: false });
  await userEvent.click(part(el, 'trigger'));
  expectPerforms(el, { open: false, openMobile: false });
  expect(document.cookie).toContain('sidebar:state=false');
  await userEvent.keyboard('{Control>}b{/Control}');
  expectPerforms(el, { open: true, openMobile: false });
});

it('toggles the desktop rail from the rail button', async () => {
  setViewport(false);
  const el = await mount();
  await userEvent.click(part(el, 'rail'));
  expectPerforms(el, { open: false, openMobile: false });
  expect(part(el, 'panel').getAttribute('data-state')).toBe('collapsed');
});

it('wraps slotted icons around a label part', async () => {
  setViewport(false);
  const el = await mount();
  const button = el.querySelector<HTMLElement>('[data-sidebar="menu-button"]');
  const start = button?.firstElementChild;
  expect(start?.getAttribute('data-part')).toBe('startIcon');
  expect(start?.getAttribute('aria-hidden')).toBe(sidebarIconAria().startIcon['aria-hidden']);
  expect(button?.querySelector('[data-part="label"]')?.textContent).toBe('Dashboard');
});

it('the mobile overlay is a modal dialog on the wrapper, never the nav', async () => {
  setViewport(true);
  const el = await mount();
  const nav = part(el, 'panel');
  const dialog = part(el, 'dialog');
  expect(nav.hidden).toBe(true);
  expect(dialog.getAttribute('role')).toBeNull();
  await userEvent.click(part(el, 'trigger'));
  expect(nav.hidden).toBe(false);
  expect(dialog.getAttribute('role')).toBe('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.getAttribute('aria-label')).toBe('Sidebar');
  expect(nav.getAttribute('role')).toBeNull();
  el.querySelector<HTMLElement>('[data-sidebar="menu-button"]')?.focus();
  await userEvent.keyboard('{Escape}');
  expect(nav.hidden).toBe(true);
  expect(document.activeElement).toBe(part(el, 'trigger'));
});

it('Escape on desktop is not swallowed and changes nothing', async () => {
  setViewport(false);
  const el = await mount();
  el.querySelector<HTMLElement>('[data-sidebar="menu-button"]')?.focus();
  let prevented = true;
  const record = (event: KeyboardEvent): void => {
    prevented = event.defaultPrevented;
  };
  document.addEventListener('keydown', record);
  await userEvent.keyboard('{Escape}');
  document.removeEventListener('keydown', record);
  expect(prevented).toBe(false);
  expect(part(el, 'panel').getAttribute('data-state')).toBe('expanded');
});

it('removing the element runs the bind teardown', async () => {
  setViewport(false);
  const el = await mount();
  const panel = part(el, 'panel');
  el.remove();
  await userEvent.keyboard('{Control>}b{/Control}');
  expect(panel.getAttribute('data-state')).toBe('expanded');
});
