import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '../../../src/components/collapsible/collapsible.element';
import type { AriaAttrs, PartIds } from '../../../src/lib/contract';
import {
  collapsible,
  type CollapsibleConfig,
  type CollapsiblePart,
  type CollapsibleState,
} from '../../../src/components/collapsible/collapsible.behavior';
import { collapsibleClasses } from '../../../src/components/collapsible/collapsible.classes';

function attrs(record: AriaAttrs | undefined): string {
  return Object.entries(record ?? {})
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${v === true ? '' : String(v)}"`)
    .join(' ');
}

// The markup collapsible.astro:54-84 renders for this config.
async function mount(config: CollapsibleConfig, id = 'c1'): Promise<HTMLElement> {
  const state = collapsible.initialState(config);
  const classes = collapsibleClasses(config, state);
  const ids: PartIds<CollapsiblePart> = {
    root: '',
    trigger: `${id}-trigger`,
    content: `${id}-content`,
  };
  const aria = collapsible.aria(state, config, ids);
  document.body.innerHTML = `<rafters-collapsible data-part="root" default-open="${String(config.defaultOpen ?? false)}" class="${classes.root}" ${attrs(aria.root)}>
    <button type="button" id="${ids.trigger}" data-part="trigger" ${config.disabled ? 'disabled' : ''} class="${classes.trigger}" ${attrs(aria.trigger)}>Toggle</button>
    <div id="${ids.content}" data-part="content" class="${classes.content}" ${state.open ? '' : 'hidden'} ${attrs(aria.content)}><p>Body</p></div>
  </rafters-collapsible>`;
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  const el = document.querySelector('rafters-collapsible');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-collapsible did not mount');
  return el;
}

function part(el: HTMLElement, name: CollapsiblePart): HTMLElement {
  const found = name === 'root' ? el : el.querySelector(`[data-part="${name}"]`);
  if (!(found instanceof HTMLElement)) throw new Error(`missing part ${name}`);
  return found;
}

function expectPerforms(el: HTMLElement, config: CollapsibleConfig, state: CollapsibleState): void {
  const ids = { root: '', trigger: part(el, 'trigger').id, content: part(el, 'content').id };
  const aria = collapsible.aria(state, config, ids);
  const classes = collapsibleClasses(config, state);
  for (const name of ['root', 'trigger', 'content'] as const) {
    expect(part(el, name).className).toBe(classes[name]);
    for (const [attr, value] of Object.entries(aria[name] ?? {})) {
      expect(part(el, name).getAttribute(attr)).toBe(value === undefined ? null : String(value));
    }
  }
  expect(part(el, 'content').hidden).toBe(!state.open);
  expect(el.shadowRoot).toBeNull();
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('binds after a microtask and toggles on click', async () => {
  const el = await mount({ defaultOpen: false, disabled: false });
  expectPerforms(el, { disabled: false }, { open: false });
  await userEvent.click(part(el, 'trigger'));
  expectPerforms(el, { disabled: false }, { open: true });
});

it('seeds open from the markup', async () => {
  const el = await mount({ defaultOpen: true, disabled: false });
  expectPerforms(el, { disabled: false }, { open: true });
});

it('disabled markup refuses the toggle', async () => {
  const el = await mount({ defaultOpen: false, disabled: true });
  await userEvent.click(part(el, 'trigger'));
  expectPerforms(el, { disabled: true }, { open: false });
});

it('Enter and Space toggle through the native button', async () => {
  const el = await mount({ defaultOpen: false, disabled: false });
  part(el, 'trigger').focus();
  await userEvent.keyboard('{Enter}');
  expect(part(el, 'content').hidden).toBe(false);
  await userEvent.keyboard(' ');
  expect(part(el, 'content').hidden).toBe(true);
});
