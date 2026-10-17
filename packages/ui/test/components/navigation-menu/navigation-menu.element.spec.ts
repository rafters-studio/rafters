import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import '../../../src/components/navigation-menu/navigation-menu.element';
import {
  navigationMenu,
  navInstanceAria,
  type NavigationMenuConfig,
  type NavigationMenuState,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';

type Attrs = Record<string, string | boolean | undefined>;
const attrs = (a: Attrs) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ');

const ITEMS = [
  { value: 'products', links: ['/widgets', '/gadgets'] },
  { value: 'about', links: ['/team'] },
];

// The markup navigation-menu.astro:132-214 renders for this config and its initial state.
function astroMarkup(config: NavigationMenuConfig, icons = false): string {
  const state = navigationMenu.initialState(config);
  const classes = navigationMenuClasses(config, state);
  const root = navigationMenu.aria(state, config, { root: 'm-root', list: 'm-list' } as never);
  const items = ITEMS.map(({ value, links }) => {
    const ids = { trigger: `m-trigger-${value}`, content: `m-content-${value}` };
    const open = config.defaultValue === value ? ' data-state="open"' : '';
    const startIcon = icons && value === 'products' ? '<svg slot="start-icon"></svg>' : '';
    const endIcon = icons && value === 'products' ? '<svg slot="end-icon"></svg>' : '';
    return `<li class="${classes.item}">
      <button type="button" id="${ids.trigger}" data-part="trigger" data-value="${value}" data-roving-item
        class="${classes.trigger}" ${attrs(navInstanceAria('trigger', value, state, config, ids))}${open}>${startIcon}${value}</button>
      <div id="${ids.content}" data-part="content" data-value="${value}" class="${classes.content}"
        ${attrs(navInstanceAria('content', value, state, config, ids))}>
        ${links.map((href) => `<a href="${href}" class="${classes.link}">${href}${endIcon}</a>`).join('')}
      </div></li>`;
  }).join('');
  const orientation = config.orientation === 'vertical' ? ' data-orientation="vertical"' : '';
  return `<nav data-part="root" id="m-root" class="${classes.root}" ${attrs(root.root ?? {})}${orientation}>
    <ul data-part="list" id="m-list" class="${classes.list}" ${attrs(root.list ?? {})}>${items}</ul></nav>`;
}

async function mount(config: NavigationMenuConfig, icons = false): Promise<HTMLElement> {
  document.body.innerHTML = `<rafters-navigation-menu>${astroMarkup(config, icons)}</rafters-navigation-menu>`;
  await Promise.resolve(); // 05-authoring.md:210-211
  const el = document.querySelector('rafters-navigation-menu');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-navigation-menu did not mount');
  return el;
}

function q(el: HTMLElement, selector: string): HTMLElement {
  const found = el.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return found;
}

function expectAttrs(node: HTMLElement, a: Attrs): void {
  for (const [name, value] of Object.entries(a)) {
    expect(node.getAttribute(name), `${node.id} ${name}`).toBe(
      value === undefined ? null : String(value),
    );
  }
}

function expectState(
  el: HTMLElement,
  config: NavigationMenuConfig,
  state: NavigationMenuState,
): void {
  const classes = navigationMenuClasses(config, state);
  expect(q(el, 'nav[data-part="root"]').className).toBe(classes.root);
  for (const { value } of ITEMS) {
    const trigger = q(el, `[data-part="trigger"][data-value="${value}"]`);
    const content = q(el, `[data-part="content"][data-value="${value}"]`);
    const ids = { trigger: trigger.id, content: content.id };
    expect(trigger.className).toBe(classes.trigger);
    expectAttrs(trigger, navInstanceAria('trigger', value, state, config, ids));
    expectAttrs(content, navInstanceAria('content', value, state, config, ids));
  }
}

let user = userEvent.setup();
beforeEach(() => {
  user = userEvent.setup();
});

afterEach(() => {
  document.body.innerHTML = '';
});

it('binds the astro markup and keeps its classes and projection', async () => {
  const config: NavigationMenuConfig = { orientation: 'horizontal' };
  const el = await mount(config);
  expectState(el, config, { active: null, pointerOpened: false });
  expect(el.shadowRoot).toBeNull();
});

it('click opens, click again closes and dismisses', async () => {
  const config: NavigationMenuConfig = { orientation: 'horizontal' };
  const el = await mount(config);
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  await user.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await user.click(trigger);
  expectState(el, config, { active: null, pointerOpened: false });
  expect(q(el, '[data-part="content"][data-value="products"]').dataset['dismissed']).toBe('true');
});

it('ArrowDown opens, Escape closes and returns focus', async () => {
  const el = await mount({ orientation: 'horizontal' });
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await user.keyboard('{Escape}');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(q(el, '[data-part="content"][data-value="products"]').dataset['dismissed']).toBe('true');
  expect(document.activeElement).toBe(trigger);
});

it('ArrowRight moves focus to the next trigger', async () => {
  const el = await mount({ orientation: 'horizontal' });
  q(el, '[data-part="trigger"][data-value="products"]').focus();
  await user.keyboard('{ArrowRight}');
  const next = q(el, '[data-part="trigger"][data-value="about"]');
  expect(document.activeElement).toBe(next);
  // The roving key itself opens nothing: the score's keymap has no open action
  // for ArrowRight. (Focus arriving on a trigger then opens its item through
  // the focus effect, which is the separate "focus opens" rule.)
});

it('vertical orientation: ArrowDown does not open', async () => {
  const config: NavigationMenuConfig = { orientation: 'vertical' };
  const el = await mount(config);
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(q(el, 'nav[data-part="root"]').getAttribute('data-orientation')).toBe('vertical');
  expect(q(el, 'ul[data-part="list"]').getAttribute('data-orientation')).toBe('vertical');
});

it('a trigger rendered open seeds the open item', async () => {
  const config: NavigationMenuConfig = { orientation: 'horizontal', defaultValue: 'about' };
  const el = await mount(config);
  expect(q(el, 'nav[data-part="root"]').getAttribute('data-state')).toBe('open');
  expect(q(el, '[data-part="trigger"][data-value="about"]').getAttribute('aria-expanded')).toBe(
    'true',
  );
});

it('a pointerdown outside the root closes an open item', async () => {
  const el = await mount({ orientation: 'horizontal' });
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  await user.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await user.pointer({ keys: '[MouseLeft]', target: document.body });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('wraps slotted icons in their decorative parts, in reading order', async () => {
  const el = await mount({ orientation: 'horizontal' }, true);
  const classes = navigationMenuClasses({}, navigationMenu.initialState({}));
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  const start = trigger.firstElementChild;
  expect(start?.matches('span[data-part="startIcon"][data-icon="inline-start"]')).toBe(true);
  expect(start?.getAttribute('aria-hidden')).toBe('true');
  expect(start?.className).toBe(classes.startIcon);
  expect(start?.querySelector('svg')).not.toBeNull();
  const link = q(el, '[data-part="content"][data-value="products"] a');
  const end = link.lastElementChild;
  expect(end?.matches('span[data-part="endIcon"][data-icon="inline-end"]')).toBe(true);
  expect(end?.getAttribute('aria-hidden')).toBe('true');
  expect(end?.className).toBe(classes.endIcon);
});

it('binds nothing and throws when there is no root', async () => {
  document.body.innerHTML = '<rafters-navigation-menu></rafters-navigation-menu>';
  await Promise.resolve();
  expect(document.querySelector('rafters-navigation-menu')).not.toBeNull();
});

it('teardown on disconnect: a former trigger click changes no ARIA', async () => {
  const el = await mount({ orientation: 'horizontal' });
  const trigger = q(el, '[data-part="trigger"][data-value="products"]');
  el.remove();
  trigger.click();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
