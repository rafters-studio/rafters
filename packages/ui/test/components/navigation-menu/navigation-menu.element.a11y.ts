import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/navigation-menu/navigation-menu.element';
import {
  navigationMenu,
  navInstanceAria,
  type NavigationMenuConfig,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';

type Attrs = Record<string, string | boolean | undefined>;
const attrs = (a: Attrs) =>
  Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ');

function markup(): string {
  const config: NavigationMenuConfig = { orientation: 'horizontal' };
  const state = navigationMenu.initialState(config);
  const classes = navigationMenuClasses(config, state);
  const root = navigationMenu.aria(state, config, { root: 'a-root', list: 'a-list' } as never);
  const ids = { trigger: 'a-trigger-products', content: 'a-content-products' };
  return `<nav data-part="root" id="a-root" aria-label="Main" class="${classes.root}" ${attrs(root.root ?? {})}>
    <ul data-part="list" id="a-list" class="${classes.list}" ${attrs(root.list ?? {})}>
      <li class="${classes.item}">
        <button type="button" id="${ids.trigger}" data-part="trigger" data-value="products" data-roving-item
          class="${classes.trigger}" ${attrs(navInstanceAria('trigger', 'products', state, config, ids))}>Products</button>
        <div id="${ids.content}" data-part="content" data-value="products" class="${classes.content}"
          ${attrs(navInstanceAria('content', 'products', state, config, ids))}>
          <a href="/widgets" class="${classes.link}">Widgets</a>
        </div>
      </li></ul></nav>`;
}

let user = userEvent.setup();
beforeEach(() => {
  user = userEvent.setup();
});

afterEach(() => {
  document.body.innerHTML = '';
});

test('navigation-menu.element closed render has no axe violations', async ({ task }) => {
  document.body.innerHTML = `<main><rafters-navigation-menu>${markup()}</rafters-navigation-menu></main>`;
  await Promise.resolve();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('navigation-menu.element open render has no axe violations', async ({ task }) => {
  document.body.innerHTML = `<main><rafters-navigation-menu>${markup()}</rafters-navigation-menu></main>`;
  await Promise.resolve();
  const trigger = document.querySelector('[data-part="trigger"]');
  if (!(trigger instanceof HTMLElement)) throw new Error('missing trigger');
  await user.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
