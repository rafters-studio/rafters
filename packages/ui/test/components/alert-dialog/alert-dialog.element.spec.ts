import { afterEach, expect, it } from 'vitest';
import '../../../src/components/alert-dialog/alert-dialog.element';
import { alertDialog } from '../../../src/components/alert-dialog/alert-dialog.behavior';
import { alertDialogClasses } from '../../../src/components/alert-dialog/alert-dialog.classes';

async function mount(attrs = '', extra = ''): Promise<void> {
  document.body.innerHTML = `
    <rafters-alert-dialog ${attrs}>
      <button type="button" data-part="trigger" id="a-trigger">Delete</button>
      <div data-part="overlay" id="a-overlay" hidden></div>
      <div id="a-container" hidden>
        <div data-part="content" id="a-content" tabindex="-1" hidden>
          <div id="a-header"><h2 data-part="title" id="a-title">Delete file?</h2></div>
          ${extra}
          <div id="a-footer">
            <button type="button" data-part="cancel" id="a-cancel">Cancel</button>
            <button type="button" data-part="action" id="a-action">Delete</button>
          </div>
        </div>
      </div>
    </rafters-alert-dialog>`;
  await Promise.resolve();
}

const ids = {
  trigger: 'a-trigger',
  overlay: 'a-overlay',
  content: 'a-content',
  title: 'a-title',
  description: '',
  cancel: 'a-cancel',
  action: 'a-action',
};

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

it('mounted closed, shows its content once opened, focus on Cancel', async () => {
  await mount();
  el('a-trigger').click();
  expect(el('a-container').hidden).toBe(false);
  expect(el('a-content').hidden).toBe(false);
  expect(el('a-content').checkVisibility()).toBe(true);
  expect(document.activeElement).toBe(el('a-cancel'));
});

it('carries the closed projection after connect', async () => {
  await mount();
  const config = { defaultOpen: false };
  const state = alertDialog.initialState(config);
  const aria = alertDialog.aria(state, config, ids);
  const trigger = el('a-trigger');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.getAttribute('data-state')).toBe(aria.trigger?.['data-state']);
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  expect(el('a-content').hidden).toBe(true);
});

it('carries the open projection and the class set after a trigger click', async () => {
  await mount();
  const config = { defaultOpen: false };
  el('a-trigger').click();
  expect(el('a-trigger').getAttribute('aria-expanded')).toBe('true');
  expect(el('a-trigger').getAttribute('aria-controls')).toBe('a-content');
  const content = el('a-content');
  expect(content.getAttribute('role')).toBe('alertdialog');
  expect(content.getAttribute('aria-modal')).toBe('true');
  expect(content.getAttribute('aria-labelledby')).toBe('a-title');
  expect(content.hasAttribute('aria-describedby')).toBe(false);
  const classes = alertDialogClasses(config, { open: true });
  expect(el('a-overlay').className).toBe(classes.overlay);
  expect(el('a-container').className).toBe(classes.container);
  expect(content.className).toBe(classes.content);
  expect(el('a-header').className).toBe(classes.header);
  expect(el('a-title').className).toBe(classes.title);
  expect(el('a-footer').className).toBe(classes.footer);
  expect(el('a-cancel').className).toBe(classes.cancel);
  expect(el('a-action').className).toBe(classes.action);
});

it('Escape from Cancel closes; outside pointerdown does not', async () => {
  await mount('default-open="true"');
  const content = el('a-content');
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
  el('a-cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(true);
  expect(document.activeElement).toBe(el('a-trigger'));
});

it('Cancel and the action both close', async () => {
  await mount();
  el('a-trigger').click();
  el('a-cancel').click();
  expect(el('a-content').hidden).toBe(true);
  el('a-trigger').click();
  el('a-action').click();
  expect(el('a-content').hidden).toBe(true);
});

it('Tab from the last focusable stays inside and body scroll is locked', async () => {
  await mount();
  el('a-trigger').click();
  expect(document.body.style.overflow).toBe('hidden');
  el('a-action').focus();
  el('a-action').dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
  );
  expect(el('a-content').contains(document.activeElement)).toBe(true);
});

it('default-open mounts open', async () => {
  await mount('default-open="true"');
  expect(el('a-content').hidden).toBe(false);
  expect(el('a-container').hidden).toBe(false);
  expect(el('a-trigger').getAttribute('aria-expanded')).toBe('true');
});

it('removing the element runs the teardown', async () => {
  await mount('default-open="true"');
  const host = document.querySelector('rafters-alert-dialog');
  if (!host) throw new Error('no host');
  const cancel = el('a-cancel');
  host.remove();
  expect(document.body.style.overflow).not.toBe('hidden');
  cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.body.style.overflow).not.toBe('hidden');
});

it('has no shadow root', async () => {
  await mount();
  expect(document.querySelector('rafters-alert-dialog')?.shadowRoot).toBeNull();
});
