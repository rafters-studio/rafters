import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToggleGroup } from '../../../src/components/toggle-group/toggle-group.element';
import {
  toggleGroup,
  toggleItemAria,
  type ToggleGroupConfig,
  type ToggleGroupPart,
  type ToggleGroupState,
} from '../../../src/components/toggle-group/toggle-group.behavior';
import { toggleGroupClasses } from '../../../src/components/toggle-group/toggle-group.classes';
import { ICON_SVG_16, installIconLayout } from './icon-layout';

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('dir');
});

const ITEMS =
  '<span data-part="item" value="bold">Bold</span>' +
  '<span data-part="item" value="italic">Italic</span>';

async function mount(attrs: string, items = ITEMS, wrap = (html: string) => html) {
  document.body.innerHTML = wrap(`<rafters-toggle-group ${attrs}>${items}</rafters-toggle-group>`);
  await Promise.resolve();
  const host = document.body.querySelector('rafters-toggle-group') as HTMLElement;
  const root = need(host.querySelector<HTMLElement>('[data-part="root"]'));
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-part="item"]'));
  return { host, root, buttons };
}

function attrsOf(el: HTMLElement, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = el.getAttribute(name);
    if (value !== null) out[name] = value;
  }
  return out;
}

const ids = (() => {
  const out = {} as Record<ToggleGroupPart, string>;
  for (const part of Object.keys(toggleGroup.parts) as ToggleGroupPart[]) out[part] = '';
  return out;
})();

interface Scenario {
  name: string;
  attrs: string;
  items?: string;
  config: ToggleGroupConfig;
  selected: string[];
}

const scenarios: Scenario[] = [
  { name: 'none pressed', attrs: '', config: {}, selected: [] },
  {
    name: 'seeded single',
    attrs: 'value="italic"',
    config: { defaultValue: 'italic' },
    selected: ['italic'],
  },
  {
    name: 'multiple',
    attrs: 'type="multiple" value="bold,italic"',
    config: { type: 'multiple', defaultValue: ['bold', 'italic'] },
    selected: ['bold', 'italic'],
  },
  {
    name: 'outline lg',
    attrs: 'variant="outline" size="lg"',
    config: { variant: 'outline', size: 'lg' },
    selected: [],
  },
  {
    name: 'vertical',
    attrs: 'orientation="vertical"',
    config: { orientation: 'vertical' },
    selected: [],
  },
  { name: 'disabled group', attrs: 'disabled', config: { disabled: true }, selected: [] },
  {
    name: 'disabled item',
    attrs: '',
    items:
      '<span data-part="item" value="bold" disabled>Bold</span>' +
      '<span data-part="item" value="italic">Italic</span>',
    config: {},
    selected: [],
  },
];

describe('toggle-group [element]', () => {
  it('upgrades, renders the parts in light DOM', async () => {
    const { host, root, buttons } = await mount('type="single" name="fmt" aria-label="Format"');
    expect(host).toBeInstanceOf(RaftersToggleGroup);
    expect(host.shadowRoot).toBeNull();
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('data-type')).toBe('single');
    expect(root.getAttribute('data-name')).toBe('fmt');
    expect(root.getAttribute('aria-label')).toBe('Format');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.hasAttribute('data-roving-item')).toBe(true);
    }
  });

  for (const scenario of scenarios) {
    it(`classes and aria match the score: ${scenario.name}`, async () => {
      const { root, buttons } = await mount(scenario.attrs, scenario.items);
      const config = scenario.config;
      const state: ToggleGroupState = toggleGroup.initialState(config);
      const classes = toggleGroupClasses(config, state);
      expect(root.className).toBe(classes.root);
      const rootAria = toggleGroup.aria(state, config, ids).root ?? {};
      const expectedRoot: Record<string, string> = {};
      for (const [k, v] of Object.entries(rootAria))
        if (v !== undefined) expectedRoot[k] = String(v);
      expect(attrsOf(root, Object.keys(rootAria))).toEqual(expectedRoot);
      for (const button of buttons) {
        const value = need(button.dataset['value']);
        expect(button.className).toBe(classes.item);
        const itemAria = toggleItemAria(value, state, config);
        const expected: Record<string, string> = {};
        for (const [k, v] of Object.entries(itemAria)) if (v !== undefined) expected[k] = String(v);
        expect(attrsOf(button, Object.keys(itemAria))).toEqual(expected);
        expect(button.getAttribute('aria-pressed') === 'true').toBe(
          scenario.selected.includes(value),
        );
      }
    });
  }

  it('single: click presses, click again clears; Space and Enter toggle once', async () => {
    const { buttons } = await mount('');
    const [bold, italic] = buttons as [HTMLButtonElement, HTMLButtonElement];
    await userEvent.click(bold);
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(bold);
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(bold);
    await userEvent.click(italic);
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(italic.getAttribute('aria-pressed')).toBe('true');
    italic.focus();
    await userEvent.keyboard(' ');
    expect(italic.getAttribute('aria-pressed')).toBe('false');
    await userEvent.keyboard('{Enter}');
    expect(italic.getAttribute('aria-pressed')).toBe('true');
  });

  it('multiple: two presses hold, releasing one releases only it', async () => {
    const { buttons } = await mount('type="multiple"');
    const [bold, italic] = buttons as [HTMLButtonElement, HTMLButtonElement];
    await userEvent.click(bold);
    await userEvent.click(italic);
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(italic.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(bold);
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(italic.getAttribute('aria-pressed')).toBe('true');
  });

  it('arrows, Home and End move focus only and skip disabled items', async () => {
    const items =
      '<span data-part="item" value="a">A</span>' +
      '<span data-part="item" value="b" disabled>B</span>' +
      '<span data-part="item" value="c">C</span>';
    const { buttons } = await mount('', items);
    const [a, , c] = buttons as [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];
    a.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(c);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(a);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(c);
    for (const button of buttons) expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('vertical orientation moves on ArrowDown', async () => {
    const { buttons } = await mount('orientation="vertical"');
    const [bold, italic] = buttons as [HTMLButtonElement, HTMLButtonElement];
    bold.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(italic);
    expect(italic.getAttribute('aria-pressed')).toBe('false');
  });

  it('a disabled group does not change on click, Space or Enter', async () => {
    const { buttons } = await mount('disabled');
    const bold = need(buttons[0]);
    expect(bold.disabled).toBe(true);
    await userEvent.click(bold);
    bold.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Enter}');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
  });

  it('a disabled item cannot be toggled', async () => {
    const { buttons } = await mount('', '<span data-part="item" value="a" disabled>A</span>');
    await userEvent.click(need(buttons[0]));
    expect(need(buttons[0]).getAttribute('aria-pressed')).toBe('false');
  });

  it('wraps start and end icons, none when absent, and honors rtl', async () => {
    const restore = installIconLayout();
    const items =
      `<span data-part="item" value="a"><span slot="start-icon">${ICON_SVG_16}</span>Alpha` +
      `<span slot="end-icon">${ICON_SVG_16}</span></span>` +
      '<span data-part="item" value="b">Beta</span>';
    const { buttons } = await mount('', items);
    const [a, b] = buttons as [HTMLButtonElement, HTMLButtonElement];
    const start = need(a.querySelector<HTMLElement>('span[data-part="startIcon"]'));
    const end = need(a.querySelector<HTMLElement>('span[data-part="endIcon"]'));
    expect(start.getAttribute('aria-hidden')).toBe('true');
    expect(end.getAttribute('aria-hidden')).toBe('true');
    expect(a.firstElementChild).toBe(start);
    expect(a.lastElementChild).toBe(end);
    expect(b.querySelector('[data-part="startIcon"], [data-part="endIcon"]')).toBeNull();
    expect(start.getBoundingClientRect().right).toBeLessThanOrEqual(
      end.getBoundingClientRect().left,
    );
    document.documentElement.setAttribute('dir', 'rtl');
    expect(start.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      end.getBoundingClientRect().right,
    );
    restore();
  });

  it('adds no form entry before or after a toggle', async () => {
    const { buttons } = await mount(
      'type="multiple" name="fmt" aria-label="Format"',
      ITEMS,
      (html) => `<form>${html}</form>`,
    );
    const form = need(document.querySelector('form'));
    expect(new FormData(form).getAll('fmt')).toEqual([]);
    await userEvent.click(need(buttons[0]));
    expect(need(buttons[0]).getAttribute('aria-pressed')).toBe('true');
    expect(new FormData(form).getAll('fmt')).toEqual([]);
  });

  it('re-adding leaves one set of parts and toggling still works', async () => {
    const items = `<span data-part="item" value="a"><span slot="start-icon">${ICON_SVG_16}</span>A</span>`;
    const { host } = await mount('', items);
    host.remove();
    document.body.appendChild(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="root"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="item"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="startIcon"]')).toHaveLength(1);
    const button = need(host.querySelector<HTMLButtonElement>('[data-part="item"]'));
    await userEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('falls back to defaults for values outside the enums', async () => {
    const { root } = await mount('type="bogus" variant="x" size="y" orientation="z"');
    const config: ToggleGroupConfig = {};
    expect(root.className).toBe(toggleGroupClasses(config, toggleGroup.initialState(config)).root);
    expect(root.getAttribute('data-type')).toBe('single');
    expect(root.getAttribute('data-orientation')).toBe('horizontal');
  });
});
