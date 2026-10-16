import { afterEach, expect, it } from 'vitest';
import '../../../src/components/popover/popover.element';
import { popover } from '../../../src/components/popover/popover.behavior';
import { popoverClasses } from '../../../src/components/popover/popover.classes';

async function mount(attrs = '', anchor = false): Promise<void> {
  document.body.innerHTML = `
    <rafters-popover ${attrs}>
      <button type="button" data-part="trigger" id="p-trigger">Open</button>
      ${anchor ? '<div data-part="anchor" id="p-anchor" style="margin-top:300px">Anchor</div>' : ''}
      <div data-part="content" id="p-content" tabindex="-1" aria-label="Details" hidden>
        <button type="button" id="p-save">Save</button>
        <button type="button" data-part="close" id="p-close">Close</button>
      </div>
    </rafters-popover>`;
  await Promise.resolve();
}

const ids = { trigger: 'p-trigger', content: 'p-content', anchor: '', close: 'p-close' };

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('applies the closed projection after connect', async () => {
  await mount();
  const config = {};
  const expected = popover.aria(popover.initialState(config), config, ids).trigger;
  const trigger = byId('p-trigger');
  expect(trigger.getAttribute('aria-haspopup')).toBe(expected?.['aria-haspopup']);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.getAttribute('data-state')).toBe('closed');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  expect(byId('p-content').hidden).toBe(true);
});

it('applies the projection, the class set, positioning and initial focus', async () => {
  await mount();
  const config = {};
  const trigger = byId('p-trigger');
  trigger.click();
  const content = byId('p-content');
  expect(content.hidden).toBe(false);
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('data-state')).toBe('open');
  expect(trigger.getAttribute('aria-controls')).toBe('p-content');
  expect(content.className).toBe(popoverClasses(config, { open: true }).content);
  expect(byId('p-close').className).toBe(popoverClasses(config, { open: true }).close);
  expect(content.style.position).toBe('fixed');
  expect(['top', 'right', 'bottom', 'left']).toContain(content.getAttribute('data-side'));
  expect(document.activeElement).toBe(byId('p-save'));
});

it('resolves data-side top when the host asks for top and there is room', async () => {
  await mount('data-side="top"', true);
  byId('p-trigger').click();
  expect(byId('p-content').getAttribute('data-side')).toBe('top');
});

it('positions against the anchor when present', async () => {
  await mount('data-side="bottom"', true);
  byId('p-trigger').click();
  const content = byId('p-content').getBoundingClientRect();
  const anchor = byId('p-anchor').getBoundingClientRect();
  const trigger = byId('p-trigger').getBoundingClientRect();
  expect(Math.abs(content.top - anchor.bottom)).toBeLessThan(
    Math.abs(content.top - trigger.bottom),
  );
});

it('does not return focus to the trigger on close', async () => {
  await mount();
  byId('p-trigger').click();
  byId('p-close').click();
  expect(byId('p-content').hidden).toBe(true);
  expect(document.activeElement).not.toBe(byId('p-trigger'));
});

it('outside pointerdown dismisses; on the trigger or anchor it does not', async () => {
  await mount('data-default-open="true"', true);
  const content = byId('p-content');
  byId('p-trigger').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
  byId('p-anchor').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(true);
});

it('Escape on the content closes', async () => {
  await mount('data-default-open="true"');
  const content = byId('p-content');
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(true);
});

it('the close button closes', async () => {
  await mount('data-default-open="true"');
  byId('p-close').click();
  expect(byId('p-content').hidden).toBe(true);
});

it('does not lock body scroll while open', async () => {
  await mount();
  byId('p-trigger').click();
  expect(document.body.style.overflow).not.toBe('hidden');
});

it('data-default-open mounts open', async () => {
  await mount('data-default-open="true"');
  expect(byId('p-content').hidden).toBe(false);
  expect(byId('p-trigger').getAttribute('aria-expanded')).toBe('true');
});

it('removing the element runs the teardown', async () => {
  await mount('data-default-open="true"');
  const content = byId('p-content');
  const host = byId('p-content').closest('rafters-popover');
  host?.remove();
  document.body.append(content);
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(false);
});

it('has no shadow root', async () => {
  await mount();
  expect(document.querySelector('rafters-popover')?.shadowRoot).toBeNull();
});
