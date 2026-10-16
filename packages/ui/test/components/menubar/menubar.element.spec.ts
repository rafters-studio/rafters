/**
 * WC performance of the menubar score, driven end to end against light-DOM
 * markup. bindMenubar applies the projection imperatively, moves each menu out
 * of the bar, and runs the bar rove and the open menu's effects; the element
 * adds the classes and wraps the icons.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/menubar/menubar.element';
import {
  menubar,
  menubarInstanceAria,
  type MenubarState,
} from '../../../src/components/menubar/menubar.behavior';
import { menubarClasses } from '../../../src/components/menubar/menubar.classes';

const ICON =
  '<svg slot="start-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor"/></svg>';

function itemMarkup(label: string, disabled = false): string {
  const dis = disabled ? 'data-disabled aria-disabled="true"' : 'tabindex="-1"';
  return `<div role="menuitem" data-part="item" data-roving-item ${dis}>${label}</div>`;
}

function menuMarkup(value: string, items: string): string {
  return `<div data-part="content" data-value="${value}" id="mb-content-${value}">${items}</div>`;
}

function triggerMarkup(value: string, label: string, attrs = ''): string {
  return `<button type="button" data-part="trigger" data-value="${value}" id="mb-trigger-${value}" ${attrs}>${label}</button>`;
}

async function mountHtml(html: string, rootAttrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-menubar data-part="root" id="mb-root" ${rootAttrs}>${html}</rafters-menubar></main>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-menubar') as HTMLElement;
}

async function mount(rootAttrs = ''): Promise<HTMLElement> {
  return mountHtml(
    triggerMarkup('file', 'File') +
      triggerMarkup('edit', 'Edit') +
      triggerMarkup('view', 'View') +
      menuMarkup(
        'file',
        itemMarkup('New') + itemMarkup('Open') + itemMarkup('Share', true) + itemMarkup('Print'),
      ) +
      menuMarkup('edit', itemMarkup('Undo') + itemMarkup('Redo')) +
      menuMarkup('view', itemMarkup('Zoom')),
    rootAttrs,
  );
}

const root = () => document.body.querySelector<HTMLElement>('rafters-menubar')!;
const trigger = (value: string) => document.getElementById(`mb-trigger-${value}`)!;
const content = (value: string) => document.getElementById(`mb-content-${value}`)!;
const item = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent === label,
  )!;

function assertAriaContract(state: MenubarState): void {
  const expectAttrs = (el: HTMLElement, attrs: Record<string, unknown>, label: string) => {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) expect(el.hasAttribute(attr), `${label} ${attr}`).toBe(false);
      else expect(el.getAttribute(attr), `${label} ${attr}`).toBe(String(value));
    }
  };
  const ids = { root: 'mb-root', trigger: '', content: '', item: '' };
  expectAttrs(root(), menubar.aria(state, {}, ids).root ?? {}, 'root');
  for (const value of ['file', 'edit', 'view']) {
    const instance = { trigger: `mb-trigger-${value}`, content: `mb-content-${value}` };
    expectAttrs(trigger(value), menubarInstanceAria('trigger', value, state, {}, instance), value);
    expectAttrs(content(value), menubarInstanceAria('content', value, state, {}, instance), value);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('menubar [wc]', () => {
  it('closed: projection and classes applied, menus inert and after the bar', async () => {
    await mount();
    const classes = menubarClasses({}, menubar.initialState({}));
    assertAriaContract(menubar.initialState({}));
    expect(root().shadowRoot).toBeNull();
    expect(content('file').inert).toBe(true);
    expect(content('file').hidden).toBe(false);
    expect(root().querySelector('[role="menu"]')).toBeNull();
    expect(root().nextElementSibling).toBe(content('file'));
    expect(root().className).toBe(classes.root);
    expect(trigger('file').className).toBe(classes.trigger);
    expect(content('file').className).toBe(classes.content);
    expect(item('New').className).toBe(classes.item);
  });

  it('click opens a menu with focus on its first enabled item', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    expect(content('file').inert).toBe(false);
    assertAriaContract({ active: 'file', pointerOpened: false });
    expect(document.activeElement).toBe(item('New'));
  });

  it('clicking another trigger switches; clicking the open trigger closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.click(trigger('edit'));
    expect(content('file').inert).toBe(true);
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
    // The switching click was absorbed; the next click on the open trigger closes.
    await user.click(trigger('edit'));
    expect(content('edit').inert).toBe(true);
  });

  it('ArrowRight/ArrowLeft/Home/End rove the triggers, wrapping by default', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('file').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('edit'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(trigger('view'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('file'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(trigger('view'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('data-loop="false" stops the trigger rove at the ends', async () => {
    const user = userEvent.setup();
    await mount('data-loop="false"');
    trigger('view').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('view'));
    trigger('file').focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('ArrowDown on a trigger opens its menu on the first enabled item', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('edit').focus();
    await user.keyboard('{ArrowDown}');
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it('arrows rove the items skipping disabled; typeahead jumps; Home/End', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(item('Print'));
    await user.keyboard('o');
    expect(document.activeElement).toBe(item('Open'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(item('Print'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(item('New'));
  });

  it('ArrowRight and ArrowLeft inside a menu switch menus, wrapping', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{ArrowRight}');
    expect(content('edit').getAttribute('data-state')).toBe('open');
    expect(content('edit').contains(document.activeElement)).toBe(true);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(content('view').inert).toBe(false);
  });

  it('Enter on an item closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{Enter}');
    expect(content('file').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('view'));
    await user.keyboard('{Escape}');
    expect(content('view').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('view'));
  });

  it('hover switches menus while one is open; hovering with all closed opens nothing', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger('edit'));
    expect(content('edit').inert).toBe(true);
    await user.click(trigger('file'));
    await user.hover(trigger('edit'));
    expect(content('edit').inert).toBe(false);
    expect(content('file').inert).toBe(true);
  });

  it('pointerdown outside closes; on a trigger it does not; blank bar space closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger('file'));
    await user.click(outside);
    expect(content('file').inert).toBe(true);
    await user.click(trigger('file'));
    await user.click(trigger('edit'));
    expect(content('edit').inert).toBe(false);
    await user.click(root());
    expect(content('edit').inert).toBe(true);
  });

  it('a trigger authored data-state="open" mounts with its menu open', async () => {
    await mountHtml(
      triggerMarkup('file', 'File', 'data-state="open"') +
        triggerMarkup('edit', 'Edit') +
        menuMarkup('file', itemMarkup('New')) +
        menuMarkup('edit', itemMarkup('Undo')),
    );
    expect(content('file').inert).toBe(false);
    expect(content('file').getAttribute('data-state')).toBe('open');
    expect(content('edit').inert).toBe(true);
  });

  it('teardown returns each menu to its authored place and stops reacting', async () => {
    const user = userEvent.setup();
    await mount();
    const host = root();
    const file = content('file');
    expect(host.contains(file)).toBe(false);
    host.remove();
    expect(host.contains(file)).toBe(true);
    expect(file.previousElementSibling?.getAttribute('data-value')).toBe('view');
    const before = host.outerHTML;
    await user.click(trigger('file'));
    host.querySelector<HTMLElement>('[data-part="trigger"]')!.focus();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(host.outerHTML).toBe(before);
  });
});

describe('menubar icons, classes and shortcut [wc]', () => {
  it('wraps slotted icons in aria-hidden wrappers carrying classes; none without an icon', async () => {
    await mountHtml(
      triggerMarkup('file', `${ICON}File`) +
        triggerMarkup('edit', 'Edit') +
        menuMarkup(
          'file',
          `<div role="menuitem" data-part="item" data-roving-item tabindex="-1">${ICON}New</div>${itemMarkup('Open')}`,
        ) +
        menuMarkup('edit', itemMarkup('Undo')),
    );
    const classes = menubarClasses({}, menubar.initialState({}));
    const wrappers = document.body.querySelectorAll<HTMLElement>('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(2);
    for (const wrapper of wrappers) {
      expect(wrapper.getAttribute('aria-hidden')).toBe('true');
      expect(wrapper.querySelector('[slot]')).toBeNull();
    }
    expect(trigger('file').querySelector<HTMLElement>('[data-part="startIcon"]')!.className).toBe(
      classes.triggerStartIcon,
    );
    expect(item('New').querySelector<HTMLElement>('[data-part="startIcon"]')!.className).toBe(
      classes.itemStartIcon,
    );
    expect(item('New').lastElementChild!.className).toBe(classes.itemText);
    expect(item('Open').querySelector('[data-part="startIcon"]')).toBeNull();
    expect(trigger('edit').querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('puts a shortcut span inside the item text column with the shortcut class', async () => {
    await mountHtml(
      triggerMarkup('file', 'File') +
        menuMarkup(
          'file',
          '<div data-part="item" role="menuitem" data-roving-item tabindex="-1">New<span>Ctrl+N</span></div>',
        ),
    );
    const classes = menubarClasses({}, menubar.initialState({}));
    const text = document.querySelector('[data-part="item"]')!.lastElementChild as HTMLElement;
    expect(text.className).toBe(classes.itemText);
    const shortcut = text.querySelector('span')!;
    expect(shortcut.textContent).toBe('Ctrl+N');
    expect(shortcut.className).toBe(classes.shortcut);
    const classed = document.querySelectorAll('[class]');
    for (const el of classed) {
      expect(el.matches('[data-part]') || el === shortcut || el === text).toBe(true);
    }
  });
});
