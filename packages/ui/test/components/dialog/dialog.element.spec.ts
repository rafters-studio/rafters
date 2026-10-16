import { afterEach, expect, it } from 'vitest';
import '../../../src/components/dialog/dialog.element';
import { dialog } from '../../../src/components/dialog/dialog.behavior';
import { dialogClasses } from '../../../src/components/dialog/dialog.classes';

async function mount(attrs = '', withDescription = false): Promise<void> {
  document.body.innerHTML = `
    <button type="button" id="outside">Outside</button>
    <rafters-dialog ${attrs}>
      <button type="button" data-part="trigger" id="d-trigger">Open</button>
      <div data-part="overlay" id="d-overlay" hidden></div>
      <div id="d-container" hidden>
        <div data-part="content" id="d-content" tabindex="-1" hidden>
          <h2 data-part="title" id="d-title">Settings</h2>
          ${withDescription ? '<p data-part="description" id="d-desc">Desc</p>' : ''}
          <button type="button" id="d-save">Save</button>
          <button type="button" data-part="close" id="d-close">Close</button>
        </div>
      </div>
    </rafters-dialog>`;
  await Promise.resolve();
}

const ids = {
  trigger: 'd-trigger',
  overlay: 'd-overlay',
  content: 'd-content',
  title: 'd-title',
  description: '',
  close: 'd-close',
};
const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const config = { modal: true, defaultOpen: false };

afterEach(() => {
  document.body.innerHTML = '';
});

it('mounted closed, shows its content once opened', async () => {
  await mount();
  el('d-trigger').click();
  expect(el('d-container').hidden).toBe(false);
  expect(el('d-content').hidden).toBe(false);
  expect(el('d-content').checkVisibility()).toBe(true);
});

it('carries the closed-state projection after connect', async () => {
  await mount();
  const aria = dialog.aria(dialog.initialState(config), config, ids);
  const trigger = el('d-trigger');
  expect(trigger.getAttribute('aria-expanded')).toBe(String(aria.trigger?.['aria-expanded']));
  expect(trigger.getAttribute('data-state')).toBe('closed');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  expect(el('d-content').hidden).toBe(true);
  expect(el('d-overlay').getAttribute('aria-hidden')).toBe('true');
  expect(el('d-close').getAttribute('aria-label')).toBe('Close');
});

it('applies the open projection and the class set', async () => {
  await mount();
  el('d-trigger').click();
  const content = el('d-content');
  expect(el('d-trigger').getAttribute('aria-controls')).toBe('d-content');
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('aria-modal')).toBe('true');
  expect(content.getAttribute('aria-labelledby')).toBe('d-title');
  expect(content.hasAttribute('aria-describedby')).toBe(false);
  const classes = dialogClasses(config, { open: true });
  expect(el('d-overlay').className).toBe(classes.overlay);
  expect(el('d-container').className).toBe(classes.container);
  expect(content.className).toBe(classes.content);
  expect(el('d-title').className).toBe(classes.title);
  expect(el('d-close').className).toBe(classes.close);
});

it('references the description when one is rendered', async () => {
  await mount('', true);
  el('d-trigger').click();
  expect(el('d-content').getAttribute('aria-describedby')).toBe('d-desc');
});

it('Escape on the content closes and returns focus to the trigger', async () => {
  await mount('default-open="true"');
  const content = el('d-content');
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(true);
  expect(document.activeElement).toBe(el('d-trigger'));
});

it('Escape with focus on the close button closes', async () => {
  await mount('default-open="true"');
  el('d-close').focus();
  el('d-close').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(el('d-content').hidden).toBe(true);
});

it('the close button closes', async () => {
  await mount('default-open="true"');
  el('d-close').click();
  expect(el('d-content').hidden).toBe(true);
});

it('modal: Tab from the last focusable stays inside the content', async () => {
  await mount('default-open="true"');
  el('d-close').focus();
  el('d-close').dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
  );
  expect(el('d-content').contains(document.activeElement)).toBe(true);
});

it('modal: outside pointerdown closes, trigger pointerdown does not', async () => {
  await mount('default-open="true"');
  el('d-trigger').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(el('d-content').hidden).toBe(false);
  el('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(el('d-content').hidden).toBe(true);
});

it('modal="false": no aria-modal, no scroll lock, outside pointerdown closes', async () => {
  await mount('modal="false" default-open="true"');
  expect(el('d-content').hasAttribute('aria-modal')).toBe(false);
  expect(document.body.style.overflow).not.toBe('hidden');
  el('outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(el('d-content').hidden).toBe(true);
});

it('default-open="true" mounts open', async () => {
  await mount('default-open="true"');
  expect(el('d-content').hidden).toBe(false);
  expect(el('d-trigger').getAttribute('aria-expanded')).toBe('true');
});

it('removing the element runs the teardown', async () => {
  await mount('default-open="true"');
  const content = el('d-content');
  (document.querySelector('rafters-dialog') as HTMLElement).remove();
  expect(document.body.style.overflow).not.toBe('hidden');
  const hiddenBefore = content.hidden;
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(hiddenBefore);
});

it('has no shadow root', async () => {
  await mount();
  expect((document.querySelector('rafters-dialog') as HTMLElement).shadowRoot).toBeNull();
});
