import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '../../../src/components/accordion/accordion.element';
import type { AriaAttrs } from '../../../src/lib/contract';
import {
  accordion,
  accordionInstanceAria,
  type AccordionConfig,
  type AccordionState,
} from '../../../src/components/accordion/accordion.behavior';
import { accordionClasses } from '../../../src/components/accordion/accordion.classes';

const VALUES = ['a', 'b'] as const;

function attrs(record: AriaAttrs | undefined): string {
  return Object.entries(record ?? {})
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${v === true ? '' : String(v)}"`)
    .join(' ');
}

// The parts accordion.astro:87-166 renders for this config, on the root host.
async function mount(config: AccordionConfig, id = 'acc'): Promise<HTMLElement> {
  const state = accordion.initialState(config);
  const classes = accordionClasses(config, state);
  const rootAria = accordion.aria(state, config, {
    root: `${id}-root`,
    item: '',
    heading: '',
    trigger: '',
    content: '',
  });
  const items = VALUES.map((value) => {
    const ids = { trigger: `${id}-trigger-${value}`, content: `${id}-content-${value}` };
    return `<div data-part="item" data-value="${value}" class="${classes.item}" ${attrs(accordionInstanceAria('item', value, state, config, {}))}>
      <div data-part="heading" data-value="${value}" class="${classes.heading}" ${attrs(accordionInstanceAria('heading', value, state, config, {}))}>
        <button type="button" id="${ids.trigger}" data-part="trigger" data-value="${value}" data-roving-item ${config.disabled ? 'disabled' : ''} class="${classes.trigger}" ${attrs(accordionInstanceAria('trigger', value, state, config, ids))}>Section ${value}<svg aria-hidden="true" class="${classes.triggerIcon}"></svg></button>
      </div>
      <div id="${ids.content}" data-part="content" data-value="${value}" class="${classes.content}" ${attrs(accordionInstanceAria('content', value, state, config, ids))}>
        <div class="${classes.contentInner}">Body ${value}</div>
      </div>
    </div>`;
  }).join('');
  document.body.innerHTML = `<rafters-accordion data-part="root" id="${id}-root" class="${classes.root}" ${attrs(rootAria.root)}>${items}</rafters-accordion>`;
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  const el = document.querySelector('rafters-accordion');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-accordion did not mount');
  return el;
}

function instance(el: HTMLElement, part: string, value: string): HTMLElement {
  const found = el.querySelector(`[data-part="${part}"][data-value="${value}"]`);
  if (!(found instanceof HTMLElement)) throw new Error(`missing ${part} ${value}`);
  return found;
}

function expectPerforms(el: HTMLElement, config: AccordionConfig, state: AccordionState): void {
  const classes = accordionClasses(config, state);
  for (const value of VALUES) {
    const ids = {
      trigger: instance(el, 'trigger', value).id,
      content: instance(el, 'content', value).id,
    };
    for (const part of ['item', 'heading', 'trigger', 'content'] as const) {
      const node = instance(el, part, value);
      expect(node.getAttribute('class')).toBe(classes[part]);
      for (const [attr, v] of Object.entries(
        accordionInstanceAria(part, value, state, config, ids),
      )) {
        expect(node.getAttribute(attr)).toBe(
          v === undefined ? null : v === true ? 'true' : String(v),
        );
      }
    }
  }
  expect(el.shadowRoot).toBeNull();
}

// Beyond the issue's block: root attributes, inert panels, aria-controls.
function expectRootAndPanels(
  el: HTMLElement,
  config: AccordionConfig,
  state: AccordionState,
): void {
  expect(el.getAttribute('class')).toBe(accordionClasses(config, state).root);
  const ids = { root: el.id, item: '', heading: '', trigger: '', content: '' };
  for (const [attr, v] of Object.entries(accordion.aria(state, config, ids).root ?? {})) {
    expect(el.getAttribute(attr)).toBe(v === undefined ? null : v === true ? 'true' : String(v));
  }
  for (const value of VALUES) {
    const content = instance(el, 'content', value);
    expect(instance(el, 'trigger', value).hasAttribute('aria-controls')).toBe(true);
    expect(content.hasAttribute('inert')).toBe(!state.value.includes(value));
    expect(content.hasAttribute('hidden')).toBe(false);
  }
}

function expanded(el: HTMLElement, value: string): string | null {
  return instance(el, 'trigger', value).getAttribute('aria-expanded');
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('collapsed state performs', async () => {
  const config: AccordionConfig = { type: 'single' };
  const el = await mount(config);
  expectPerforms(el, config, { value: [], multiple: false, collapsible: false });
  expectRootAndPanels(el, config, { value: [], multiple: false, collapsible: false });
});

it('single mode: click opens one section and ignores a click on the open one', async () => {
  const config: AccordionConfig = { type: 'single', collapsible: false, headingLevel: 3 };
  const el = await mount(config);
  await userEvent.click(instance(el, 'trigger', 'b'));
  await userEvent.click(instance(el, 'trigger', 'b'));
  expectPerforms(el, config, { value: ['b'], multiple: false, collapsible: false });
  await userEvent.click(instance(el, 'trigger', 'a'));
  expect(expanded(el, 'a')).toBe('true');
  expect(expanded(el, 'b')).toBe('false');
});

it('single collapsible: the open section can close to empty', async () => {
  const config: AccordionConfig = { type: 'single', collapsible: true };
  const el = await mount(config);
  await userEvent.click(instance(el, 'trigger', 'a'));
  expect(expanded(el, 'a')).toBe('true');
  await userEvent.click(instance(el, 'trigger', 'a'));
  expectPerforms(el, config, { value: [], multiple: false, collapsible: true });
});

it('multiple mode toggles membership', async () => {
  const config: AccordionConfig = { type: 'multiple' };
  const el = await mount(config);
  await userEvent.click(instance(el, 'trigger', 'a'));
  await userEvent.click(instance(el, 'trigger', 'b'));
  expectPerforms(el, config, { value: ['a', 'b'], multiple: true, collapsible: true });
  expectRootAndPanels(el, config, { value: ['a', 'b'], multiple: true, collapsible: true });
  await userEvent.click(instance(el, 'trigger', 'a'));
  expect(expanded(el, 'a')).toBe('false');
  expect(expanded(el, 'b')).toBe('true');
});

it('seeds the open section from the markup', async () => {
  const config: AccordionConfig = { type: 'single', defaultValue: 'b' };
  const el = await mount(config);
  expectPerforms(el, { type: 'single' }, { value: ['b'], multiple: false, collapsible: false });
});

it('a disabled root refuses every toggle', async () => {
  const config: AccordionConfig = { type: 'single', disabled: true };
  const el = await mount(config);
  await userEvent.click(instance(el, 'trigger', 'a'));
  expect(expanded(el, 'a')).toBe('false');
  expect(expanded(el, 'b')).toBe('false');
});

it('roving moves focus without toggling', async () => {
  const el = await mount({ type: 'single' });
  instance(el, 'trigger', 'a').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'b'));
  expect(instance(el, 'trigger', 'b').getAttribute('aria-expanded')).toBe('false');
  await userEvent.keyboard('{Enter}');
  expect(expanded(el, 'b')).toBe('true');
  await userEvent.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'a'));
  await userEvent.keyboard('{End}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'b'));
  await userEvent.keyboard('{Home}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'a'));
  await userEvent.keyboard(' ');
  expect(expanded(el, 'a')).toBe('true');
  const tabbable = el.querySelectorAll('[data-part="trigger"]:not([tabindex="-1"])');
  expect(tabbable.length).toBe(1);
});

it('roving skips a disabled header', async () => {
  const el = await mount({ type: 'single' });
  instance(el, 'trigger', 'b').setAttribute('disabled', '');
  instance(el, 'trigger', 'a').focus();
  await userEvent.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(instance(el, 'trigger', 'a'));
});

it('teardown on removal stops the bind', async () => {
  const el = await mount({ type: 'multiple' });
  const trigger = instance(el, 'trigger', 'a');
  el.remove();
  trigger.click();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('binds without throwing when a trigger lacks data-value and heading level is unparseable', async () => {
  document.body.innerHTML = `<rafters-accordion data-part="root" data-type="single" data-heading-level="x"><button data-part="trigger" data-roving-item>No value</button></rafters-accordion>`;
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  expect(document.querySelector('rafters-accordion')?.shadowRoot).toBeNull();
});
