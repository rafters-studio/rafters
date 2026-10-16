/**
 * Web Component performance of the select score. <rafters-select> decorates
 * bindSelect with the view (selectClasses) and the custom-element wiring.
 * Parts, classes and ARIA come from the element; every assertion compares
 * against the score, never a hand-written string.
 */
import userEvent from '@testing-library/user-event';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import type { PartIds } from '../../../src/lib/contract';
import {
  select,
  selectItemAria,
  type SelectConfig,
  type SelectPart,
  type SelectState,
} from '../../../src/components/select/select.behavior';
import { selectClasses } from '../../../src/components/select/select.classes';
import '../../../src/components/select/select.element';

const ICON = '<svg viewBox="0 0 16 16"><title>glyph</title></svg>';

function markup(attrs = '', icons = false): string {
  return `<rafters-select ${attrs}>
    <button data-part="trigger" aria-label="Fruit">
      ${icons ? `<span slot="start-icon">${ICON}</span><span slot="end-icon">${ICON}</span>` : ''}
      <span data-part="value" placeholder="Pick"></span>
    </button>
    <div data-part="content">
      <div data-part="item" value="a">${icons ? `<span slot="start-icon">${ICON}</span>` : ''}Apple</div>
      <div data-part="item" value="b">Banana</div>
      <div data-part="item" value="c" disabled>Cherry</div>
    </div>
  </rafters-select>`;
}

async function mount(attrs = '', icons = false): Promise<HTMLElement> {
  document.body.innerHTML = `<form>${markup(attrs, icons)}</form><button type="button" id="outside">Outside</button>`;
  await Promise.resolve();
  const host = document.querySelector<HTMLElement>('rafters-select');
  if (!host) throw new Error('rafters-select did not mount');
  return host;
}

const q = (host: HTMLElement, selector: string): HTMLElement => {
  const el = host.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
};
const trigger = (h: HTMLElement) => q(h, '[data-part="trigger"]') as HTMLButtonElement;
const content = (h: HTMLElement) => q(h, '[data-part="content"]');
const items = (h: HTMLElement) => Array.from(h.querySelectorAll<HTMLElement>('[data-part="item"]'));
const form = () => document.querySelector('form') as HTMLFormElement;

function attrsOf(el: Element, expected: Record<string, string | boolean | undefined>): void {
  for (const [k, v] of Object.entries(expected)) {
    expect(el.getAttribute(k), k).toBe(v === undefined ? null : String(v));
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('select.element', () => {
  it('renders the select.tsx parts in light DOM', async () => {
    const host = await mount();
    expect(host.shadowRoot).toBeNull();
    for (const el of host.querySelectorAll('*')) expect(el.shadowRoot).toBeNull();
    expect(host.getAttribute('data-part')).toBe('root');
    expect(trigger(host).type).toBe('button');
    expect(trigger(host).lastElementChild?.tagName.toLowerCase()).toBe('svg');
    const [apple] = items(host);
    expect(apple?.children).toHaveLength(2);
    expect(apple?.children[1]?.textContent).toBe('Apple');
    expect(host.querySelector('input[data-part="hidden-input"]')).toBeNull();
  });

  it('classes and ARIA equal the score in each scenario', async () => {
    const scenarios: Array<[string, string, boolean, SelectConfig]> = [
      ['closed', '', false, {}],
      ['seeded', 'value="b"', false, { defaultValue: 'b' }],
      ['disabled', 'disabled', false, { disabled: true }],
      ['icons', '', true, {}],
    ];
    for (const [, attrs, icons, config] of scenarios) {
      const host = await mount(`name="fruit" ${attrs}`, icons);
      const cfg: SelectConfig = { ...config, name: 'fruit' };
      const state: SelectState = select.initialState(cfg);
      const classes = selectClasses(cfg, state);
      const ids = {
        root: host.id,
        trigger: trigger(host).id,
        content: content(host).id,
      } as PartIds<SelectPart>;
      const aria = select.aria(state, cfg, ids);
      expect(trigger(host).className).toBe(classes.trigger);
      expect(content(host).className).toBe(classes.content);
      expect(q(host, '[data-part="value"]').className).toBe(classes.value);
      attrsOf(host, aria.root ?? {});
      attrsOf(trigger(host), aria.trigger ?? {});
      attrsOf(content(host), aria.content ?? {});
      for (const item of items(host)) {
        expect(item.className).toBe(classes.item);
        attrsOf(item, selectItemAria(item.dataset['value'] ?? '', state, cfg));
      }
      if (icons) {
        const start = q(host, '[data-part="trigger"] > [data-part="startIcon"]');
        const end = q(host, '[data-part="trigger"] > [data-part="endIcon"]');
        expect(start.className).toBe(classes.triggerStartIcon);
        expect(end.className).toBe(classes.triggerEndIcon);
        attrsOf(start, aria.startIcon ?? {});
        attrsOf(end, aria.endIcon ?? {});
        expect(start.dataset['icon']).toBe('inline-start');
        expect(end.dataset['icon']).toBe('inline-end');
        const itemIcon = q(items(host)[0] as HTMLElement, '[data-part="startIcon"]');
        expect(itemIcon.className).toBe(classes.startIcon);
        expect(itemIcon.getAttribute('aria-hidden')).toBe('true');
        expect(q(host, '[data-part="value"]').textContent).toBe('Pick');
        expect((items(host)[0] as HTMLElement).textContent).toContain('Apple');
      }
      document.body.innerHTML = '';
    }
  });

  it('opens on click and the keys, landing on the first enabled option', async () => {
    const host = await mount();
    await userEvent.click(trigger(host));
    expect(content(host).hidden).toBe(false);
    expect(trigger(host).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(host).getAttribute('aria-controls')).toBe(content(host).id);
    expect(document.activeElement).toBe(items(host)[0]);
    await userEvent.keyboard('{Escape}');
    for (const key of ['{ArrowDown}', '{ArrowUp}', '{Enter}', ' ']) {
      trigger(host).focus();
      await userEvent.keyboard(key);
      expect(content(host).hidden, key).toBe(false);
      await userEvent.keyboard('{Escape}');
      expect(content(host).hidden, key).toBe(true);
      expect(document.activeElement).toBe(trigger(host));
    }
  });

  it('roves, types ahead and highlights while open', async () => {
    const host = await mount();
    await userEvent.click(trigger(host));
    const [apple, banana] = items(host);
    expect(apple?.hasAttribute('data-highlighted')).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(banana);
    expect(banana?.hasAttribute('data-highlighted')).toBe(true);
    expect(apple?.hasAttribute('data-highlighted')).toBe(false);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(apple);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(banana);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(apple);
    await userEvent.keyboard('b');
    expect(document.activeElement).toBe(banana);
  });

  it('selects by click, Enter and Space; a disabled option does nothing', async () => {
    const host = await mount('name="fruit"');
    const valueEl = q(host, '[data-part="value"]');
    expect(valueEl.textContent).toBe('Pick');
    expect(valueEl.hasAttribute('data-empty')).toBe(true);
    await userEvent.click(trigger(host));
    await userEvent.click(page.getByRole('option', { name: 'Banana' }).element());
    expect(content(host).hidden).toBe(true);
    expect(valueEl.textContent).toBe('Banana');
    expect(valueEl.hasAttribute('data-empty')).toBe(false);
    expect(document.activeElement).toBe(trigger(host));
    await Promise.resolve();
    const [apple, banana] = items(host);
    expect(banana?.getAttribute('data-state')).toBe('checked');
    expect(apple?.getAttribute('data-state')).toBe('unchecked');
    expect(banana?.getAttribute('aria-selected')).toBe('true');

    await userEvent.click(trigger(host));
    expect(document.activeElement).toBe(banana);
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    expect(valueEl.textContent).toBe('Apple');
    await userEvent.click(trigger(host));
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');
    expect(valueEl.textContent).toBe('Banana');

    await userEvent.click(trigger(host));
    const cherry = items(host)[2] as HTMLElement;
    cherry.click();
    expect(content(host).hidden).toBe(false);
    expect(valueEl.textContent).toBe('Banana');
  });

  it('dismisses on a pointerdown outside but spares the trigger', async () => {
    const host = await mount();
    await userEvent.click(trigger(host));
    trigger(host).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(content(host).hidden).toBe(false);
    document
      .getElementById('outside')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(content(host).hidden).toBe(true);
  });

  it('seeds from value and does not open when disabled', async () => {
    const seeded = await mount('value="b"');
    expect(q(seeded, '[data-part="value"]').textContent).toBe('Banana');
    await userEvent.click(trigger(seeded));
    expect(document.activeElement).toBe(items(seeded)[1]);

    const disabled = await mount('disabled');
    expect(trigger(disabled).disabled).toBe(true);
    expect(trigger(disabled).getAttribute('aria-disabled')).toBe('true');
    trigger(disabled).click();
    trigger(disabled).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(content(disabled).hidden).toBe(true);
  });

  it('submits exactly one form entry, disabled or not', async () => {
    const host = await mount('name="fruit"');
    expect(new FormData(form()).getAll('fruit')).toEqual(['']);
    await userEvent.click(trigger(host));
    await userEvent.click(items(host)[1] as HTMLElement);
    expect(new FormData(form()).getAll('fruit')).toEqual(['b']);

    await mount('name="fruit" value="b" disabled');
    expect(new FormData(form()).getAll('fruit')).toEqual(['b']);
  });

  it('survives removal and re-adding with one set of parts', async () => {
    const host = await mount('name="fruit"');
    const parent = host.parentElement as HTMLElement;
    host.remove();
    parent.append(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="trigger"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="viewport"]')).toHaveLength(1);
    expect(host.querySelectorAll('input[data-part="hidden-input"]')).toHaveLength(1);
    expect(trigger(host).querySelectorAll('svg')).toHaveLength(1);
    for (const item of items(host)) expect(item.children).toHaveLength(2);
    await userEvent.click(trigger(host));
    expect(content(host).hidden).toBe(false);
    await userEvent.click(items(host)[1] as HTMLElement);
    expect(q(host, '[data-part="value"]').textContent).toBe('Banana');
    expect(new FormData(form()).getAll('fruit')).toEqual(['b']);
  });

  it('runs the issue functional test', async () => {
    document.body.innerHTML = `<form>${markup('name="fruit"')}</form>`;
    await Promise.resolve();
    const host = document.querySelector<HTMLElement>('rafters-select') as HTMLElement;
    const config: SelectConfig = { name: 'fruit' };
    const closed: SelectState = { open: false, value: '', highlighted: undefined };
    const ids = {
      root: host.id,
      trigger: trigger(host).id,
      content: content(host).id,
    } as PartIds<SelectPart>;
    expect(trigger(host).className).toBe(selectClasses(config, closed).trigger);
    for (const [k, v] of Object.entries(select.aria(closed, config, ids).trigger ?? {})) {
      expect(trigger(host).getAttribute(k)).toBe(v === undefined ? null : String(v));
    }
    await userEvent.click(page.getByRole('combobox', { name: 'Fruit' }).element());
    expect(content(host).hidden).toBe(false);
    await userEvent.click(page.getByRole('option', { name: 'Banana' }).element());
    expect(content(host).hidden).toBe(true);
    expect(q(host, '[data-part="value"]').textContent).toBe('Banana');
    expect(new FormData(form()).getAll('fruit')).toEqual(['b']);
  });
});
