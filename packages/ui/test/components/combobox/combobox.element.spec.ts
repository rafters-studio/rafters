/**
 * Web Component performance of the combobox score, in light DOM, in real
 * chromium. Parts, classes and ARIA come from the elements; the expectations
 * come from the score (combobox.aria, comboboxItemAria) and the view
 * (comboboxClasses), so the three performances cannot drift.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { AriaAttrs, PartIds } from '../../../src/lib/contract';
import '../../../src/components/combobox/combobox.element';
import {
  combobox,
  comboboxItemAria,
  type ComboboxConfig,
  type ComboboxPart,
  type ComboboxState,
} from '../../../src/components/combobox/combobox.behavior';
import { comboboxClasses } from '../../../src/components/combobox/combobox.classes';

const ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24"><title>icon</title><rect width="24" height="24"/></svg>';
const SLOTTED_ICON = ICON.replace('<svg', '<svg slot="start-icon"');

interface Scene {
  attrs?: string;
  contentAttrs?: string;
  hostIcon?: boolean;
  itemIcon?: boolean;
  disabledItem?: boolean;
}

function markup({
  attrs = '',
  contentAttrs = '',
  hostIcon,
  itemIcon,
  disabledItem,
}: Scene): string {
  return `
    <rafters-combobox ${attrs}>
      ${hostIcon ? SLOTTED_ICON : ''}
      <rafters-combobox-input aria-label="Framework" name="fw" placeholder="Search"></rafters-combobox-input>
      <rafters-combobox-content ${contentAttrs}>
        <rafters-combobox-empty>None</rafters-combobox-empty>
        <rafters-combobox-item value="react">${itemIcon ? SLOTTED_ICON : ''}React</rafters-combobox-item>
        <rafters-combobox-item value="vue">Vue</rafters-combobox-item>
        <rafters-combobox-item value="angular"${disabledItem ? ' disabled' : ''}>Angular</rafters-combobox-item>
      </rafters-combobox-content>
    </rafters-combobox>`;
}

async function mount(scene: Scene = {}): Promise<HTMLElement> {
  document.body.innerHTML = `<form>${markup(scene)}</form>`;
  await Promise.resolve();
  return document.querySelector<HTMLElement>('rafters-combobox') as HTMLElement;
}

const q = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel) as T;
const input = () => q<HTMLInputElement>('[data-part="input"]');
const content = () => q('[data-part="content"]');
const trigger = () => q('[data-part="trigger"]');
const item = (v: string) => q(`[data-part="item"][data-value="${v}"]`);

function idsOf(host: HTMLElement): PartIds<ComboboxPart> {
  return { root: host.id, input: input().id, content: content().id } as PartIds<ComboboxPart>;
}

function expectAria(el: Element, attrs: AriaAttrs | undefined): void {
  for (const [k, v] of Object.entries(attrs ?? {})) {
    expect(el.getAttribute(k), k).toBe(v === undefined ? null : String(v));
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('combobox [wc] parts', () => {
  it('upgrades and renders the parts combobox.tsx renders, in light DOM', async () => {
    const host = await mount();
    expect(host.shadowRoot).toBeNull();
    for (const el of host.querySelectorAll('*')) expect(el.shadowRoot).toBeNull();
    expect(host.dataset['part']).toBe('root');
    expect(q('[data-part="field"]')).not.toBeNull();
    expect(input().type).toBe('text');
    expect(input().autocomplete).toBe('off');
    expect(input().getAttribute('name')).toBe('fw');
    expect(input().getAttribute('placeholder')).toBe('Search');
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().getAttribute('type')).toBe('button');
    expect(trigger().getAttribute('tabindex')).toBe('-1');
    expect(trigger().querySelector('svg')).not.toBeNull();
    expect(content().id).toBe(`${host.id}-content`);
    expect(item('vue').id).toBe(`${content().id}-option-vue`);
    expect(item('vue').children).toHaveLength(2);
    expect(item('vue').lastElementChild?.textContent).toBe('Vue');
    expect(document.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('renders a group heading named by aria-labelledby, and a separator', async () => {
    document.body.innerHTML = `
      <rafters-combobox>
        <rafters-combobox-input aria-label="Framework"></rafters-combobox-input>
        <rafters-combobox-content>
          <rafters-combobox-group heading="Frameworks">
            <rafters-combobox-item value="react">React</rafters-combobox-item>
          </rafters-combobox-group>
          <rafters-combobox-separator></rafters-combobox-separator>
        </rafters-combobox-content>
      </rafters-combobox>`;
    await Promise.resolve();
    const group = q('rafters-combobox-group');
    const label = group.firstElementChild as HTMLElement;
    expect(group.getAttribute('role')).toBe('group');
    expect(label.textContent).toBe('Frameworks');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    const classes = comboboxClasses({}, combobox.initialState({}));
    expect(group.className).toBe(classes.group);
    expect(label.className).toBe(classes.groupLabel);
    expect(q('rafters-combobox-separator').className).toBe(classes.separator);
    expect(q('rafters-combobox-separator').getAttribute('aria-hidden')).toBe('true');
  });
});

const closed: ComboboxState = { open: false, query: '', value: '', highlighted: undefined };

describe('combobox [wc] classes and aria per scenario', () => {
  const scenarios: Array<[string, Scene, ComboboxConfig, ComboboxState]> = [
    ['closed', {}, {}, closed],
    [
      'open',
      { contentAttrs: 'data-state="open"' },
      { defaultOpen: true },
      { ...closed, open: true },
    ],
    [
      'seeded value',
      { attrs: 'value="vue"' },
      { defaultValue: 'vue' },
      { ...closed, value: 'vue' },
    ],
    ['disabled', { attrs: 'disabled' }, { disabled: true }, closed],
    ['start icons', { hostIcon: true, itemIcon: true }, {}, closed],
  ];
  for (const [name, scene, config, state] of scenarios) {
    it(`${name}: every part equals the score and the view`, async () => {
      const host = await mount(scene);
      const classes = comboboxClasses(config, state);
      const aria = combobox.aria(state, config, idsOf(host));
      expect(host.className).toBe(classes.root);
      expectAria(host, aria.root);
      expect(input().className).toBe(classes.input);
      expectAria(input(), aria.input);
      expect(q('[data-part="field"]').className).toBe(classes.field);
      expect(trigger().className).toBe(classes.trigger);
      expectAria(trigger(), aria.trigger);
      expect(content().className).toBe(classes.content);
      expectAria(content(), aria.content);
      expect(content().hidden).toBe(!state.open);
      expect(q('[data-part="empty"]').className).toBe(classes.empty);
      expect(item('react').className).toBe(classes.item);
      expect(item('react').querySelector('span')?.className).toBe(classes.itemIndicator);
      for (const v of ['react', 'vue', 'angular']) {
        expectAria(item(v), comboboxItemAria(v, state, config));
        expect(item(v).id).toBe(`${content().id}-option-${v}`);
      }
      expect(input().disabled).toBe(config.disabled ?? false);
    });
  }

  it('filtered to empty: the empty message shows and every option is hidden', async () => {
    await mount();
    await userEvent.type(input(), 'zzz');
    expect(q('[data-part="empty"]').hidden).toBe(false);
    expect(item('react').hidden).toBe(true);
    expect(item('vue').hidden).toBe(true);
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });
});

describe('combobox [wc] behavior', () => {
  it('typing filters options in place and opens the list', async () => {
    await mount();
    expect(q('[data-part="empty"]').hidden).toBe(true);
    await userEvent.type(page.getByRole('combobox', { name: 'Framework' }).element(), 'vu');
    expect(item('react').hidden).toBe(true);
    expect(item('vue').hidden).toBe(false);
    expect(content().hidden).toBe(false);
    expect(q('[data-part="empty"]').hidden).toBe(true);
  });

  it('ArrowDown opens, highlights, clamps; Enter commits and moves the check', async () => {
    await mount();
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(input().getAttribute('aria-activedescendant')).toBe(`${content().id}-option-react`);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe(`${content().id}-option-angular`);
    await userEvent.keyboard('{ArrowUp}');
    expect(input().getAttribute('aria-activedescendant')).toBe(`${content().id}-option-vue`);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input().getAttribute('aria-activedescendant')).toBe(`${content().id}-option-react`);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe('Vue');
    expect(content().hidden).toBe(true);
    expect(item('vue').getAttribute('aria-selected')).toBe('true');
    expect(item('vue').querySelector('svg')).not.toBeNull();
    expect(item('react').querySelector('svg')).toBeNull();
  });

  it('a disabled option cannot be highlighted or committed', async () => {
    await mount({ disabledItem: true });
    input().focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe(`${content().id}-option-vue`);
    await userEvent.click(item('angular'));
    expect(input().value).toBe('');
    expect(item('angular').getAttribute('aria-disabled')).toBe('true');
  });

  it('Escape closes and keeps focus; Tab closes and focus moves on', async () => {
    await mount();
    input().focus();
    await userEvent.keyboard('{ArrowDown}{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(input());
    await userEvent.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    await userEvent.tab();
    expect(content().hidden).toBe(true);
    expect(document.activeElement).not.toBe(input());
  });

  it('the toggle opens and closes with Open / Close labels and returns focus to the input', async () => {
    await mount();
    expect(trigger().getAttribute('aria-label')).toBe('Open');
    await userEvent.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-label')).toBe('Close');
    expect(document.activeElement).toBe(input());
    await userEvent.click(trigger());
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-label')).toBe('Open');
  });

  it('clicking an option commits it; moving the pointer over one highlights it', async () => {
    await mount();
    await userEvent.click(trigger());
    await userEvent.hover(item('vue'));
    expect(item('vue').hasAttribute('data-highlighted')).toBe(true);
    await userEvent.click(item('react'));
    expect(input().value).toBe('React');
    expect(content().hidden).toBe(true);
  });

  it('a pointerdown outside closes; on the input or the toggle it does not', async () => {
    await mount();
    await userEvent.click(trigger());
    input().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    trigger().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(content().hidden).toBe(false);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(content().hidden).toBe(true);
  });

  it('value="vue" seeds the selection', async () => {
    await mount({ attrs: 'value="vue"' });
    expect(item('vue').getAttribute('aria-selected')).toBe('true');
    expect(item('react').getAttribute('aria-selected')).toBe('false');
    expect(item('vue').querySelector('svg')).not.toBeNull();
  });

  it('disabled renders a native disabled input that neither opens nor filters', async () => {
    await mount({ attrs: 'disabled' });
    expect(input().disabled).toBe(true);
    expect(input().getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(trigger());
    expect(content().hidden).toBe(true);
    input().value = 'vu';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(item('react').hidden).toBe(false);
    expect(content().hidden).toBe(true);
  });

  it('start-icon children render in aria-hidden wrappers and stay out of the committed label', async () => {
    await mount({ hostIcon: true, itemIcon: true });
    const wrappers = document.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(2);
    for (const w of wrappers) {
      expect(w.getAttribute('aria-hidden')).toBe('true');
      expect(w.getAttribute('data-icon')).toBe('inline-start');
      expect(w.querySelector('[slot]')).toBeNull();
    }
    expect(q('[data-part="field"] > [data-part="startIcon"]')).not.toBeNull();
    expect(item('react').querySelector(':scope > [data-part="startIcon"]')).not.toBeNull();
    await userEvent.click(trigger());
    await userEvent.click(item('react'));
    expect(input().value).toBe('React');
  });
});

describe('combobox [wc] form association', () => {
  it('submits the input text and holds no hidden input', async () => {
    await mount();
    await userEvent.type(input(), 'vu');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const form = q<HTMLFormElement>('form');
    expect(new FormData(form).getAll('fw')).toEqual(['Vue']);
    expect(form.querySelector('input[type="hidden"]')).toBeNull();
    expect(form.querySelectorAll('input')).toHaveLength(1);
  });

  it('a disabled combobox submits nothing', async () => {
    await mount({ attrs: 'disabled' });
    expect(new FormData(q<HTMLFormElement>('form')).getAll('fw')).toEqual([]);
  });
});

describe('combobox [wc] lifecycle', () => {
  it('removing and re-adding leaves one set of parts, and still filters and commits', async () => {
    const host = await mount();
    const parent = host.parentElement as HTMLElement;
    host.remove();
    parent.appendChild(host);
    await Promise.resolve();
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(document.querySelectorAll('[data-part="trigger"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-part="item"]')).toHaveLength(3);
    expect(item('vue').children).toHaveLength(2);
    await userEvent.type(input(), 'vu');
    expect(item('react').hidden).toBe(true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input().value).toBe('Vue');
  });

  it('the first connection leaves no scroll or resize listener behind', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    await mount();
    const added = add.mock.calls.filter(([type]) => type === 'scroll' || type === 'resize');
    expect(added).toHaveLength(0);
    add.mockRestore();
  });

  it('listeners added while open are removed on disconnect', async () => {
    const host = await mount();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    await userEvent.click(trigger());
    host.remove();
    const types = (calls: ReadonlyArray<ReadonlyArray<unknown>>): unknown[] =>
      calls
        .map(([type]) => type)
        .filter((t) => t === 'scroll' || t === 'resize')
        .sort();
    expect(types(remove.mock.calls)).toEqual(types(add.mock.calls));
    expect(types(add.mock.calls)).toHaveLength(2);
    add.mockRestore();
    remove.mockRestore();
  });
});
