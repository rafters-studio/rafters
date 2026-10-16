import { afterEach, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import '../../../src/components/resizable/resizable.element';
import {
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
  type ResizablePanelConfig,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';

afterEach(() => {
  document.body.innerHTML = '';
});

function attrs(record: Record<string, string | boolean | undefined>): string {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value)}"`)
    .join('');
}

// The light-DOM markup resizable.astro:106-164 renders for this config.
function astroMarkup(config: ResizableConfig): string {
  const state = resizableBehavior.initialState(config);
  const classes = resizableClasses(config, state);
  const ids = { root: 'r-root', panel: 'r-panel', handle: 'r-handle' };
  const root = resizableBehavior.aria(state, config, ids).root ?? {};
  const parts = config.panels.map((panel: ResizablePanelConfig, i: number) => {
    const panelHtml = `<div data-part="panel" data-index="${i}" data-panel-default="${panel.defaultSize}" data-panel-min="${panel.minSize}" data-panel-max="${panel.maxSize}" class="${classes.panel}" style="flex-basis:${state.sizes[i]}%">P${i}</div>`;
    if (i === config.panels.length - 1) return panelHtml;
    const handleAria = resizableHandleAria(String(i), state, config);
    const disabled = config.disabled ? ' data-disabled="true"' : '';
    return `${panelHtml}<div role="separator" data-part="handle" data-index="${i}" data-value="${i}"${disabled} tabindex="${config.disabled ? -1 : 0}" aria-label="Resize" class="${classes.handle}"${attrs(handleAria)}></div>`;
  });
  return `<rafters-resizable><div data-part="root" id="${ids.root}" data-direction="${config.direction}" class="${classes.root}"${attrs(root)}>${parts.join('')}</div></rafters-resizable>`;
}

async function mount(config: ResizableConfig): Promise<HTMLElement> {
  document.body.innerHTML = astroMarkup(config);
  await Promise.resolve(); // the bind runs one microtask after connect
  const root = document.querySelector('rafters-resizable [data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no resizable root');
  return root;
}

function expectPerforms(root: HTMLElement, config: ResizableConfig, sizes: number[]): void {
  const state = { sizes };
  const classes = resizableClasses(config, state);
  expect(root.className).toBe(classes.root);
  expect(root.getAttribute('data-orientation')).toBe(config.direction);
  for (const [i, panel] of Array.from(
    root.querySelectorAll<HTMLElement>('[data-part="panel"]'),
  ).entries()) {
    expect(panel.className).toBe(classes.panel);
    expect(panel.style.flexBasis).toBe(`${sizes[i]}%`);
  }
  for (const [i, handle] of Array.from(
    root.querySelectorAll<HTMLElement>('[data-part="handle"]'),
  ).entries()) {
    for (const [name, value] of Object.entries(resizableHandleAria(String(i), state, config))) {
      expect(handle.getAttribute(name)).toBe(value === undefined ? null : String(value));
    }
  }
}

const HALVES: ResizableConfig = {
  direction: 'horizontal',
  disabled: false,
  panels: [
    { defaultSize: 50, minSize: 20, maxSize: 100 },
    { defaultSize: 50, minSize: 0, maxSize: 100 },
  ],
};

it('enhances the author markup in light DOM', async () => {
  const root = await mount(HALVES);
  expect(document.querySelector('rafters-resizable')?.shadowRoot).toBeNull();
  expectPerforms(root, HALVES, [50, 50]);
});

it('resizes from the keyboard and fires the bind input event', async () => {
  const root = await mount(HALVES);
  let inputs = 0;
  document.addEventListener('input', () => inputs++);
  root.querySelector<HTMLElement>('[data-part="handle"]')?.focus();
  await userEvent.keyboard('{ArrowRight}');
  expectPerforms(root, HALVES, [51, 49]);
  expect(inputs).toBe(1);
  await userEvent.keyboard('{Home}');
  expectPerforms(root, HALVES, [20, 80]);
});

it('resizes a vertical group with ArrowDown', async () => {
  const config: ResizableConfig = { ...HALVES, direction: 'vertical' };
  const root = await mount(config);
  root.querySelector<HTMLElement>('[data-part="handle"]')?.focus();
  await userEvent.keyboard('{ArrowDown}');
  expectPerforms(root, config, [51, 49]);
  await userEvent.keyboard('{ArrowRight}');
  expectPerforms(root, config, [51, 49]);
});

it('a disabled group does not resize and fires no input event', async () => {
  const config = { ...HALVES, disabled: true };
  const root = await mount(config);
  let inputs = 0;
  document.addEventListener('input', () => inputs++);
  root.querySelector<HTMLElement>('[data-part="handle"]')?.focus();
  await userEvent.keyboard('{ArrowRight}');
  expectPerforms(root, config, [50, 50]);
  expect(inputs).toBe(0);
});

it('tears the bind down when the element is removed', async () => {
  const root = await mount(HALVES);
  const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
  handle?.focus();
  document.querySelector('rafters-resizable')?.remove();
  await userEvent.keyboard('{ArrowRight}');
  expect(handle?.getAttribute('aria-valuenow')).toBe('50');
});

it('drags a handle and carries data-dragging only while dragging', async () => {
  const root = await mount(HALVES);
  const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
  if (!handle) throw new Error('no handle');
  const box = handle.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  await userEvent.pointer([{ keys: '[MouseLeft>]', target: handle, coords: { x, y } }]);
  await userEvent.pointer({ coords: { x: x + 40, y } });
  expect(handle.hasAttribute('data-dragging')).toBe(true);
  expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  expect(handle.hasAttribute('data-dragging')).toBe(false);
});

it('binds nothing and throws when there is no root', async () => {
  document.body.innerHTML = '<rafters-resizable></rafters-resizable>';
  await Promise.resolve();
  expect(document.querySelector('rafters-resizable')?.shadowRoot).toBeNull();
});
