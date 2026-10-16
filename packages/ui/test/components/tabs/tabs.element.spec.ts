import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '../../../src/components/tabs/tabs.element';
import type { AriaAttrs } from '../../../src/lib/contract';
import {
  tabs,
  tabsIds,
  tabsInstanceAria,
  type TabsConfig,
  type TabsState,
} from '../../../src/components/tabs/tabs.behavior';
import { tabsClasses } from '../../../src/components/tabs/tabs.classes';

const VALUES = ['overview', 'details', 'history'] as const;

function attrs(record: AriaAttrs | undefined): string {
  return Object.entries(record ?? {})
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${v === true ? '' : String(v)}"`)
    .join(' ');
}

// The parts tabs.astro:72-174 renders for this config, on the root host; `value` is the WC's
// controlled attribute (tabs.md:157), absent for an uncontrolled root.
async function mount(config: TabsConfig, controlled?: string, id = 't1'): Promise<HTMLElement> {
  const state = tabs.initialState(config);
  const classes = tabsClasses(config, state);
  const aria = tabs.aria(state, config, {
    root: `${id}-root`,
    list: `${id}-list`,
    trigger: '',
    panel: '',
    startIcon: '',
    endIcon: '',
  });
  const triggers = VALUES.map((value) => {
    const { triggerId, panelId } = tabsIds(id, value);
    const stop = value === (state.value ?? VALUES[0]) ? 0 : -1;
    return `<button type="button" role="tab" id="${triggerId}" data-part="trigger" data-value="${value}" tabindex="${stop}" class="${classes.trigger}" ${attrs(tabsInstanceAria('trigger', value, state, config, { trigger: triggerId, panel: panelId }))}>${value}</button>`;
  }).join('');
  const panels = VALUES.map((value) => {
    const { triggerId, panelId } = tabsIds(id, value);
    return `<div role="tabpanel" id="${panelId}" data-part="panel" data-value="${value}" tabindex="0" class="${classes.panel}" ${attrs(tabsInstanceAria('panel', value, state, config, { trigger: triggerId, panel: panelId }))}><p>${value} body</p></div>`;
  }).join('');
  const valueAttr = controlled === undefined ? '' : `value="${controlled}"`;
  document.body.innerHTML = `<rafters-tabs data-part="root" id="${id}-root" ${valueAttr} class="${classes.root}" ${attrs(aria.root)}>
    <div data-part="list" id="${id}-list" role="tablist" class="${classes.list}" ${attrs(aria.list)}>${triggers}</div>${panels}
  </rafters-tabs>`;
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  const el = document.querySelector('rafters-tabs');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-tabs did not mount');
  return el;
}

function instance(el: HTMLElement, part: 'trigger' | 'panel', value: string): HTMLElement {
  const found = el.querySelector(`[data-part="${part}"][data-value="${value}"]`);
  if (!(found instanceof HTMLElement)) throw new Error(`missing ${part} ${value}`);
  return found;
}

function expectPerforms(el: HTMLElement, config: TabsConfig, state: TabsState): void {
  const classes = tabsClasses(config, state);
  for (const value of VALUES) {
    const ids = {
      trigger: instance(el, 'trigger', value).id,
      panel: instance(el, 'panel', value).id,
    };
    const trigger = instance(el, 'trigger', value);
    expect(trigger.getAttribute('class')).toBe(classes.trigger);
    for (const [attr, v] of Object.entries(
      tabsInstanceAria('trigger', value, state, config, ids),
    )) {
      expect(trigger.getAttribute(attr)).toBe(v === undefined ? null : String(v));
    }
    const panelAria = tabsInstanceAria('panel', value, state, config, ids);
    expect(instance(el, 'panel', value).hasAttribute('hidden')).toBe(panelAria['hidden'] === true);
  }
  expect(el.shadowRoot).toBeNull();
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('uncontrolled: click activates', async () => {
  const el = await mount({ defaultValue: 'overview' });
  await userEvent.click(instance(el, 'trigger', 'details'));
  expectPerforms(el, { defaultValue: 'overview' }, { value: 'details' });
});

it('controlled: a click never moves the value; the attribute does', async () => {
  const el = await mount({ defaultValue: 'overview' }, 'overview');
  await userEvent.click(instance(el, 'trigger', 'details'));
  expectPerforms(el, { value: 'overview' }, { value: 'details' });
  el.setAttribute('value', 'details');
  expect(instance(el, 'panel', 'details').hasAttribute('hidden')).toBe(false);
  expect(instance(el, 'panel', 'overview').hasAttribute('hidden')).toBe(true);
});

it('arrow keys move and activate (automatic activation)', async () => {
  const el = await mount({ defaultValue: 'overview' });
  instance(el, 'trigger', 'overview').focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'details'));
  expect(instance(el, 'panel', 'details').hasAttribute('hidden')).toBe(false);
});

it('vertical: ArrowDown moves', async () => {
  const el = await mount({ defaultValue: 'overview', orientation: 'vertical' });
  instance(el, 'trigger', 'overview').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'details'));
});

it('arrows inside a panel leave the active tab unchanged', async () => {
  const el = await mount({ defaultValue: 'overview' });
  instance(el, 'panel', 'overview').focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(instance(el, 'panel', 'overview').hasAttribute('hidden')).toBe(false);
});

it('wraps a slotted start icon first in the trigger', async () => {
  const el = document.createElement('rafters-tabs');
  el.setAttribute('data-part', 'root');
  el.innerHTML =
    '<div data-part="list" role="tablist"><button type="button" role="tab" data-part="trigger" data-value="a"><svg slot="start-icon"></svg>Label</button></div>';
  document.body.appendChild(el);
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  const trigger = instance(el, 'trigger', 'a');
  const wrapper = trigger.firstElementChild;
  expect(wrapper?.getAttribute('data-part')).toBe('startIcon');
  expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
});

it('removing the element tears the bind down', async () => {
  const el = await mount({ defaultValue: 'overview' });
  const trigger = instance(el, 'trigger', 'details');
  el.remove();
  trigger.click();
  expect(trigger.getAttribute('aria-selected')).toBe('false');
});
