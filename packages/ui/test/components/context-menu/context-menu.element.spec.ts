/**
 * Web Component performance of the context-menu score: <rafters-context-menu>
 * decorates the behavior with the view and the lifecycle, and calls the same
 * bindContextMenu the Astro script calls. Assertions compare against the
 * score's own aria and the shared classes, never hand-written values.
 */
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/context-menu/context-menu.element';
import {
  contextMenu,
  contextSubMenu,
} from '../../../src/components/context-menu/context-menu.behavior';
import { contextMenuClasses } from '../../../src/components/context-menu/context-menu.classes';

const config = { loop: true, avoidCollisions: true };
const ids = { trigger: 'cm-trigger', content: 'cm-content', startIcon: '' };
const subIds = { subTrigger: 'cm-sub-trigger', subContent: 'cm-sub-content' };

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-context-menu ${attrs}>
      <span data-part="trigger" id="cm-trigger" tabindex="-1">Right-click here</span>
      <div data-part="content" id="cm-content" role="menu" aria-label="Actions" hidden>
        <div role="menuitem" tabindex="-1"><svg slot="start-icon" viewBox="0 0 16 16"></svg>Cut<kbd>Ctrl+X</kbd></div>
        <div role="menuitem" tabindex="-1">Copy</div>
        <div role="menuitem" tabindex="-1" aria-disabled="true" data-disabled="">Disabled</div>
        <div role="menuitemcheckbox" tabindex="-1" aria-checked="false">Wrap</div>
        <div role="menuitemradio" tabindex="-1" aria-checked="false">Paste</div>
        <div data-part="sub" id="cm-sub">
          <div data-part="sub-trigger" id="cm-sub-trigger" role="menuitem" tabindex="-1">More</div>
          <div data-part="sub-content" id="cm-sub-content" role="menu" aria-label="More">
            <div role="menuitem" tabindex="-1" id="cm-deep">Deep</div>
          </div>
        </div>
      </div>
    </rafters-context-menu>`;
  await Promise.resolve();
  return document.querySelector('rafters-context-menu') as HTMLElement;
}

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const rightClick = (x: number, y: number): boolean =>
  el('cm-trigger').dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }),
  );
const key = (target: Element | null, k: string): boolean =>
  (target as Element).dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
  );
const items = (): HTMLElement[] =>
  Array.from(el('cm-content').querySelectorAll<HTMLElement>(':scope > [role^="menuitem"]'));
const label = (item: Element | null): string | null =>
  item?.querySelector('[data-part="label"]')?.textContent ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('rafters-context-menu', () => {
  it('has no shadow root', async () => {
    const host = await mount();
    expect(host.shadowRoot).toBeNull();
  });

  it('projects the closed-state aria after connect', async () => {
    await mount();
    const aria = contextMenu.aria({ open: false, x: 0, y: 0 }, config, ids);
    expect(el('cm-trigger').getAttribute('data-state')).toBe(aria.trigger?.['data-state']);
    expect(el('cm-trigger').hasAttribute('role')).toBe(false);
    expect(el('cm-content').getAttribute('aria-orientation')).toBe('vertical');
    expect(el('cm-content').getAttribute('data-state')).toBe('closed');
    expect(el('cm-content').hidden).toBe(true);
  });

  it('right-click opens at the point and focuses the first item; a second click moves it', async () => {
    await mount();
    const content = el('cm-content');
    rightClick(40, 50);
    const state = { open: true, x: 40, y: 50 };
    expect(content.getAttribute('data-state')).toBe(
      contextMenu.aria(state, config, ids).content?.['data-state'],
    );
    expect(content.hidden).toBe(false);
    expect(content.style.left).toBe('40px');
    expect(content.style.top).toBe('50px');
    expect(label(document.activeElement)).toBe('Cut');
    rightClick(70, 80);
    expect(content.style.left).toBe('70px');
    expect(content.style.top).toBe('80px');
  });

  it('applies the classes from contextMenuClasses', async () => {
    await mount();
    const classes = contextMenuClasses(config, { open: false, x: 0, y: 0 });
    expect(el('cm-trigger').className).toBe(classes.trigger);
    expect(el('cm-content').className).toBe(classes.content);
    expect(items()[0]?.className).toBe(classes.item);
    expect(items()[3]?.className).toBe(classes.checkboxItem);
    expect(items()[4]?.className).toBe(classes.radioItem);
    expect(el('cm-sub').className).toBe(classes.sub);
    expect(el('cm-sub-trigger').className).toBe(classes.subTrigger);
    expect(el('cm-sub-content').className).toBe(classes.subContent);
    expect(items()[0]?.querySelector('kbd')?.className).toBe(classes.shortcut);
  });

  it('wraps the icon and label and keeps the kbd after the label', async () => {
    await mount();
    const item = items()[0] as HTMLElement;
    const icon = item.querySelector('[data-part="startIcon"]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('data-icon')).toBe('inline-start');
    expect(icon?.querySelector('svg')).not.toBeNull();
    expect(label(item)).toBe('Cut');
    expect(item.querySelector('[data-part="label"] kbd')).toBeNull();
    const lab = item.querySelector('[data-part="label"]') as Element;
    expect(lab.nextElementSibling?.tagName).toBe('KBD');
  });

  it('ArrowDown skips disabled and wraps from the last to the first', async () => {
    await mount();
    rightClick(1, 1);
    key(document.activeElement, 'ArrowDown');
    expect(label(document.activeElement)).toBe('Copy');
    key(document.activeElement, 'ArrowDown');
    expect(document.activeElement).not.toBe(items()[2]);
    key(document.activeElement, 'End');
    key(document.activeElement, 'ArrowDown');
    expect(label(document.activeElement)).toBe('Cut');
  });

  it('loop off stays on the last item', async () => {
    await mount('data-loop="false"');
    rightClick(1, 1);
    key(document.activeElement, 'End');
    const last = document.activeElement;
    key(last, 'ArrowDown');
    expect(document.activeElement).toBe(last);
  });

  it('typeahead focuses the matching item', async () => {
    await mount();
    rightClick(1, 1);
    key(document.activeElement, 'p');
    expect(label(document.activeElement)).toBe('Paste');
  });

  it('Escape closes and returns focus to the trigger', async () => {
    await mount();
    rightClick(10, 10);
    key(document.activeElement, 'Escape');
    expect(el('cm-content').hidden).toBe(true);
    expect(document.activeElement).toBe(el('cm-trigger'));
  });

  it('Enter and click on an item close the menu', async () => {
    await mount();
    rightClick(10, 10);
    key(document.activeElement, 'Enter');
    expect(el('cm-content').hidden).toBe(true);
    rightClick(10, 10);
    (items()[1] as HTMLElement).click();
    expect(el('cm-content').hidden).toBe(true);
  });

  it('pointerdown outside closes the menu', async () => {
    await mount();
    rightClick(10, 10);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(el('cm-content').hidden).toBe(true);
  });

  it('moves the sub-content to body, closed and never hidden', async () => {
    await mount();
    const sub = el('cm-sub-content');
    const closed = contextSubMenu.aria({ open: false }, config, subIds);
    expect(sub.parentElement).toBe(document.body);
    expect(sub.getAttribute('aria-hidden')).toBe('true');
    expect(sub.getAttribute('data-state')).toBe(closed.subContent?.['data-state']);
    expect(sub.hidden).toBe(false);
  });

  it('ArrowRight opens the submenu, ArrowLeft closes it', async () => {
    await mount();
    rightClick(10, 10);
    const subTrigger = el('cm-sub-trigger');
    const sub = el('cm-sub-content');
    subTrigger.focus();
    key(subTrigger, 'ArrowRight');
    expect(subTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(subTrigger.getAttribute('aria-controls')).toBe('cm-sub-content');
    expect(sub.getAttribute('data-open-source')).toBe('discrete');
    expect(sub.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(el('cm-deep'));
    key(el('cm-deep'), 'ArrowLeft');
    expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(subTrigger);
  });

  it('pointerenter opens the submenu as pointer, pointerleave closes it', async () => {
    await mount();
    rightClick(10, 10);
    const subTrigger = el('cm-sub-trigger');
    subTrigger.dispatchEvent(new PointerEvent('pointerenter'));
    expect(el('cm-sub-content').getAttribute('data-open-source')).toBe('pointer');
    subTrigger.dispatchEvent(new PointerEvent('pointerleave'));
    expect(subTrigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking an item in an open submenu closes both and focuses the trigger', async () => {
    await mount();
    rightClick(10, 10);
    el('cm-sub-trigger').focus();
    key(el('cm-sub-trigger'), 'ArrowRight');
    el('cm-deep').click();
    expect(el('cm-sub-trigger').getAttribute('aria-expanded')).toBe('false');
    expect(el('cm-content').hidden).toBe(true);
    expect(document.activeElement).toBe(el('cm-trigger'));
  });

  it('data-default-open mounts open', async () => {
    await mount('data-default-open="true"');
    expect(el('cm-content').hidden).toBe(false);
    expect(el('cm-content').getAttribute('data-state')).toBe('open');
  });

  it('removal tears down: sub-content returns and the trigger no longer opens', async () => {
    const host = await mount();
    const trigger = el('cm-trigger');
    const sub = el('cm-sub-content');
    const content = el('cm-content');
    host.remove();
    expect(sub.parentElement?.id).toBe('cm-sub');
    document.body.appendChild(trigger);
    rightClick(5, 5);
    expect(content.hidden).toBe(true);
  });
});
