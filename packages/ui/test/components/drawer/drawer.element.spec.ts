/**
 * Web Component performance of the drawer score. <rafters-drawer> decorates
 * bindDrawer with the view (drawerClasses) and the custom-element wiring.
 * The markup is the light DOM bindDrawer reads; every ARIA, data-state, inert
 * and class assertion compares against the score, never a hand-written string.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { drawer, type DrawerConfig } from '../../../src/components/drawer/drawer.behavior';
import { drawerClasses } from '../../../src/components/drawer/drawer.classes';
import { RaftersDrawer } from '../../../src/components/drawer/drawer.element';

const ids = {
  root: '',
  trigger: 'dr-trigger',
  overlay: 'dr-overlay',
  content: 'dr-content',
  title: 'dr-title',
  description: '',
  close: 'dr-close',
};

async function mount(
  attrs = '',
  body = '<button type="button">Checkout</button>',
  extra = '',
): Promise<RaftersDrawer> {
  document.body.innerHTML = `
    <rafters-drawer ${attrs}>
      <button type="button" data-part="trigger" id="dr-trigger">Open</button>
      <div data-part="overlay" id="dr-overlay"></div>
      <div data-part="content" id="dr-content" tabindex="-1">
        <div aria-hidden="true"></div>
        <h2 data-part="title" id="dr-title">Cart</h2>
        ${extra}
        ${body}
        <button type="button" data-part="close" id="dr-close">Close</button>
      </div>
    </rafters-drawer>
    <button type="button" id="outside">Outside</button>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-drawer') as RaftersDrawer;
}

const el = (id: string) => document.getElementById(id) as HTMLElement;

const sides = ['top', 'right', 'bottom', 'left'] as const;

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('drawer [wc]', () => {
  it('is a registered RaftersDrawer with no shadow root', async () => {
    const host = await mount();
    expect(host).toBeInstanceOf(RaftersDrawer);
    expect(host.shadowRoot).toBeNull();
  });

  it('closed: parts carry the closed projection, present and inert, never hidden', async () => {
    await mount();
    const config: DrawerConfig = { modal: true, defaultOpen: false };
    const aria = drawer.aria(drawer.initialState(config), config, ids);
    const trigger = el('dr-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.getAttribute('aria-haspopup')).toBe(aria.trigger?.['aria-haspopup']);
    for (const id of ['dr-overlay', 'dr-content']) {
      expect(el(id).inert).toBe(true);
      expect(el(id).hidden).toBe(false);
      expect(el(id).getAttribute('data-state')).toBe('closed');
    }
    expect(el('dr-content').getAttribute('role')).toBe(aria.content?.['role']);
    expect(el('dr-close').getAttribute('aria-label')).toBe(aria.close?.['aria-label']);
  });

  it('trigger click opens: open projection, inert removed', async () => {
    await mount();
    el('dr-trigger').click();
    const config: DrawerConfig = { modal: true, defaultOpen: false };
    const open = { open: true };
    const aria = drawer.aria(open, config, ids);
    expect(el('dr-trigger').getAttribute('aria-expanded')).toBe('true');
    expect(el('dr-trigger').getAttribute('aria-controls')).toBe('dr-content');
    expect(el('dr-content').getAttribute('role')).toBe('dialog');
    expect(el('dr-content').getAttribute('aria-modal')).toBe('true');
    expect(el('dr-content').getAttribute('data-state')).toBe(aria.content?.['data-state']);
    expect(el('dr-content').inert).toBe(false);
    expect(el('dr-overlay').inert).toBe(false);
  });

  for (const side of sides) {
    it(`content class follows data-side="${side}"`, async () => {
      await mount(`data-side="${side}"`);
      const config: DrawerConfig = { modal: true, defaultOpen: false, side };
      const classes = drawerClasses(config, drawer.initialState(config));
      expect(el('dr-content').className).toBe(classes.content);
    });
  }

  it('content class defaults to bottom for a missing or unknown side', async () => {
    const config: DrawerConfig = { modal: true, defaultOpen: false, side: 'bottom' };
    const bottom = drawerClasses(config, drawer.initialState(config)).content;
    await mount();
    expect(el('dr-content').className).toBe(bottom);
    await mount('data-side="sideways"');
    expect(el('dr-content').className).toBe(bottom);
  });

  it('overlay, handle, title, description and close carry their classes', async () => {
    await mount('', '', '<p data-part="description" id="dr-desc">Items</p>');
    const config: DrawerConfig = { modal: true, defaultOpen: false };
    const classes = drawerClasses(config, drawer.initialState(config));
    expect(el('dr-overlay').className).toBe(classes.overlay);
    expect(el('dr-content').querySelector('[aria-hidden="true"]')?.className).toBe(classes.handle);
    expect(el('dr-title').className).toBe(classes.title);
    expect(el('dr-desc').className).toBe(classes.description);
    expect(el('dr-close').className).toBe(classes.close);
  });

  it('title without description: labelledby the title, no describedby', async () => {
    await mount();
    el('dr-trigger').click();
    expect(el('dr-content').getAttribute('aria-labelledby')).toBe('dr-title');
    expect(el('dr-content').hasAttribute('aria-describedby')).toBe(false);
  });

  it('Escape closes and focus returns to the trigger', async () => {
    await mount();
    el('dr-trigger').click();
    await userEvent.keyboard('{Escape}');
    expect(el('dr-content').inert).toBe(true);
    expect(document.activeElement).toBe(el('dr-trigger'));
  });

  it('Escape closes when the trap lands focus on the close button', async () => {
    await mount('', '');
    el('dr-trigger').click();
    const close = el('dr-close');
    expect(document.activeElement).toBe(close);
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el('dr-content').inert).toBe(true);
    expect(document.activeElement).toBe(el('dr-trigger'));
  });

  it('the close button closes the drawer', async () => {
    await mount();
    el('dr-trigger').click();
    el('dr-close').click();
    expect(el('dr-content').inert).toBe(true);
    expect(el('dr-trigger').getAttribute('aria-expanded')).toBe('false');
  });

  it('open and modal: Tab from the last focusable stays inside the content', async () => {
    await mount();
    el('dr-trigger').click();
    el('dr-close').focus();
    await userEvent.tab();
    expect(el('dr-content').contains(document.activeElement)).toBe(true);
  });

  it('open and modal: body scroll is locked', async () => {
    await mount();
    el('dr-trigger').click();
    expect(document.body.style.overflow).toBe('hidden');
    el('dr-close').click();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('open and modal: a pointerdown outside closes the drawer', async () => {
    await mount();
    el('dr-trigger').click();
    el('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(el('dr-content').inert).toBe(true);
  });

  it('clicking the trigger while open closes and leaves it closed', async () => {
    await mount();
    el('dr-trigger').click();
    el('dr-trigger').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el('dr-trigger').click();
    expect(el('dr-content').inert).toBe(true);
    expect(el('dr-trigger').getAttribute('aria-expanded')).toBe('false');
  });

  it('data-modal="false": no aria-modal, no scroll lock, Escape still closes', async () => {
    await mount('data-modal="false"');
    el('dr-trigger').click();
    expect(el('dr-content').hasAttribute('aria-modal')).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
    el('dr-content').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(el('dr-content').inert).toBe(true);
  });

  it('data-default-open="true" mounts the drawer open', async () => {
    await mount('data-default-open="true"');
    expect(el('dr-content').inert).toBe(false);
    expect(el('dr-trigger').getAttribute('aria-expanded')).toBe('true');
  });

  it('removing the element runs the teardown', async () => {
    const host = await mount();
    el('dr-trigger').click();
    expect(document.body.style.overflow).toBe('hidden');
    const content = el('dr-content');
    host.remove();
    expect(document.body.style.overflow).not.toBe('hidden');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(content.getAttribute('data-state')).toBe('open');
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
