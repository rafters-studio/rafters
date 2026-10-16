import { afterEach, expect, it } from 'vitest';
import '../../../src/components/dropdown-menu/dropdown-menu.element';
import { dropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';
import { dropdownMenuClasses } from '../../../src/components/dropdown-menu/dropdown-menu.classes';

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-dropdown-menu id="dm-root" ${attrs}>
      <button type="button" data-part="trigger" id="dm-trigger">Actions</button>
      <div data-part="content" id="dm-content" hidden>
        <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1"><svg slot="start-icon" viewBox="0 0 16 16"></svg>Edit</div>
        <div role="menuitem" data-part="item" data-roving-item="" data-disabled="" aria-disabled="true">Archive</div>
        <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1">Delete</div>
      </div>
    </rafters-dropdown-menu>`;
  await Promise.resolve();
  return document.querySelector('rafters-dropdown-menu') as HTMLElement;
}

const ids = {
  root: 'dm-root',
  trigger: 'dm-trigger',
  content: 'dm-content',
  item: '',
  startIcon: '',
};

afterEach(() => {
  document.body.innerHTML = '';
});

it('applies the closed projection, then the open projection on trigger click', async () => {
  await mount();
  const config = { defaultOpen: false };
  const trigger = document.getElementById('dm-trigger')!;
  const content = document.getElementById('dm-content')!;
  const closed = dropdownMenu.aria(dropdownMenu.initialState(config), config, ids);
  expect(trigger.getAttribute('aria-expanded')).toBe(closed.trigger?.['aria-expanded']);
  expect(content.getAttribute('aria-labelledby')).toBe('dm-trigger');
  expect(content.hidden).toBe(true);
  trigger.click();
  expect(trigger.getAttribute('aria-controls')).toBe('dm-content');
  expect(content.hidden).toBe(false);
  expect(content.className).toBe(dropdownMenuClasses(config, { open: true }).content);
  expect(document.activeElement?.textContent).toBe('Edit');
});

it('wraps the start icon in an aria-hidden part', async () => {
  await mount();
  const icon = document.querySelector<HTMLElement>('[data-part="startIcon"]')!;
  expect(icon.getAttribute('aria-hidden')).toBe('true');
  expect(icon.getAttribute('data-icon')).toBe('inline-start');
  expect(icon.querySelector('svg')).not.toBeNull();
});

it('Escape closes and returns focus to the trigger', async () => {
  await mount('default-open="true"');
  const content = document.getElementById('dm-content')!;
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
  expect(content.hidden).toBe(true);
  expect(document.activeElement).toBe(document.getElementById('dm-trigger'));
});

// Additional coverage of the acceptance criteria.
async function mountFull(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-dropdown-menu id="dm-root" ${attrs}>
      <button type="button" data-part="trigger" id="dm-trigger">Actions</button>
      <div data-part="content" id="dm-content" hidden>
        <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1"><svg slot="start-icon" viewBox="0 0 16 16"></svg>Edit</div>
        <div role="menuitem" data-part="item" data-roving-item="" data-disabled="" aria-disabled="true">Archive</div>
        <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1">Delete</div>
        <div role="menuitemcheckbox" aria-checked="false" data-part="item" data-roving-item="" tabindex="-1">Pin</div>
        <div role="menuitemradio" aria-checked="false" data-part="item" data-roving-item="" tabindex="-1">Sort</div>
      </div>
    </rafters-dropdown-menu>`;
  await Promise.resolve();
  const el = document.querySelector('rafters-dropdown-menu');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-dropdown-menu did not mount');
  return el;
}

function part(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing ${id}`);
  return el;
}

function items(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-part="item"]')];
}

function key(target: Element, k: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

const config = { defaultOpen: false };

it('projects closed ARIA, then open ARIA with controls and focus', async () => {
  await mountFull();
  const trigger = part('dm-trigger');
  const content = part('dm-content');
  const closed = dropdownMenu.aria(dropdownMenu.initialState(config), config, ids);
  expect(trigger.getAttribute('aria-haspopup')).toBe(closed.trigger?.['aria-haspopup']);
  expect(trigger.getAttribute('aria-expanded')).toBe(closed.trigger?.['aria-expanded']);
  expect(trigger.getAttribute('data-state')).toBe('closed');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  expect(content.getAttribute('role')).toBe('menu');
  expect(content.getAttribute('aria-orientation')).toBe('vertical');
  expect(content.getAttribute('aria-labelledby')).toBe('dm-trigger');
  expect(content.hidden).toBe(true);
  trigger.click();
  expect(trigger.getAttribute('aria-controls')).toBe('dm-content');
  expect(part('dm-root').getAttribute('data-state')).toBe('open');
  expect(content.getAttribute('data-state')).toBe('open');
  expect(content.hidden).toBe(false);
  expect(content.className).toBe(dropdownMenuClasses(config, { open: true }).content);
  expect(document.activeElement?.textContent).toBe('Edit');
});

it('applies classes by part and item role', async () => {
  await mountFull();
  const classes = dropdownMenuClasses(config, { open: false });
  expect(part('dm-trigger').className).toBe(classes.trigger);
  expect(part('dm-content').className).toBe(classes.content);
  const all = items();
  expect(all[0]?.className).toBe(classes.item);
  expect(all[3]?.className).toBe(classes.checkboxItem);
  expect(all[4]?.className).toBe(classes.radioItem);
});

it('wraps the start icon and lays the label in its cell', async () => {
  await mountFull();
  const classes = dropdownMenuClasses(config, { open: false });
  const all = items();
  const icon = all[0]?.querySelector<HTMLElement>(
    '[data-part="startIcon"][data-icon="inline-start"]',
  );
  expect(icon).not.toBeNull();
  expect(icon?.getAttribute('aria-hidden')).toBe('true');
  expect(icon?.className).toBe(classes.startIcon);
  expect(icon?.querySelector('svg')).not.toBeNull();
  const label = all[0]?.querySelector<HTMLElement>('[data-slot="label"]');
  expect(label?.className).toBe(classes.itemLabel);
  expect(label?.textContent).toBe('Edit');
  expect(all[2]?.querySelector('[data-part="startIcon"]')).toBeNull();
});

it('opens from the trigger with ArrowDown, Enter and Space', async () => {
  await mountFull();
  const trigger = part('dm-trigger');
  const content = part('dm-content');
  for (const k of ['ArrowDown', 'Enter', ' ']) {
    key(trigger, k);
    expect(content.hidden).toBe(false);
    expect(document.activeElement?.textContent).toBe('Edit');
    key(document.activeElement as Element, 'Escape');
    expect(content.hidden).toBe(true);
  }
});

it('roves focus, loops, skips disabled, and jumps with Home and End', async () => {
  await mountFull();
  part('dm-trigger').click();
  const all = items();
  const enabled = all.filter((i) => !i.hasAttribute('data-disabled'));
  const last = enabled[enabled.length - 1] as HTMLElement;
  key(document.activeElement as Element, 'ArrowDown');
  expect(document.activeElement).toBe(all[2]);
  key(document.activeElement as Element, 'End');
  expect(document.activeElement).toBe(last);
  key(document.activeElement as Element, 'ArrowDown');
  expect(document.activeElement).toBe(all[0]);
  key(document.activeElement as Element, 'End');
  key(document.activeElement as Element, 'Home');
  expect(document.activeElement).toBe(all[0]);
});

it('typeahead matches the label without the icon', async () => {
  await mountFull();
  part('dm-trigger').click();
  key(document.activeElement as Element, 'd');
  expect(document.activeElement?.textContent).toBe('Delete');
});

it('Escape on a focused item closes and refocuses the trigger', async () => {
  await mountFull();
  part('dm-trigger').click();
  key(document.activeElement as Element, 'Escape');
  expect(part('dm-content').hidden).toBe(true);
  expect(document.activeElement).toBe(part('dm-trigger'));
});

it('Enter and click on an item close; a disabled item does neither', async () => {
  await mountFull();
  const trigger = part('dm-trigger');
  const content = part('dm-content');
  const all = items();
  trigger.click();
  key(document.activeElement as Element, 'Enter');
  expect(content.hidden).toBe(true);
  expect(document.activeElement).toBe(trigger);
  trigger.click();
  all[2]?.click();
  expect(content.hidden).toBe(true);
  expect(document.activeElement).toBe(trigger);
  trigger.click();
  all[1]?.click();
  expect(content.hidden).toBe(false);
  key(all[1] as Element, 'Enter');
  expect(content.hidden).toBe(false);
});

it('closes on pointerdown outside, not on the trigger', async () => {
  await mountFull();
  const content = part('dm-content');
  part('dm-trigger').click();
  part('dm-trigger').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(true);
});

it('default-open mounts open', async () => {
  await mountFull('default-open="true"');
  expect(part('dm-content').hidden).toBe(false);
  expect(part('dm-trigger').getAttribute('aria-expanded')).toBe('true');
});

it('removing the element runs the teardown', async () => {
  const el = await mountFull();
  const trigger = part('dm-trigger');
  const content = part('dm-content');
  el.remove();
  document.body.append(trigger, content);
  trigger.click();
  expect(content.hidden).toBe(true);
  content.hidden = false;
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
});

it('stays light DOM with the content inside the element', async () => {
  const el = await mountFull();
  part('dm-trigger').click();
  expect(el.shadowRoot).toBeNull();
  expect(el.contains(part('dm-content'))).toBe(true);
});
