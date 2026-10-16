import { afterEach, expect, it } from 'vitest';
import '../../../src/components/sheet/sheet.element';
import { sheet, type SheetConfig } from '../../../src/components/sheet/sheet.behavior';
import { sheetClasses, sheetContentClasses } from '../../../src/components/sheet/sheet.classes';

interface MountOptions {
  attrs?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  body?: string;
  title?: boolean;
  description?: boolean;
}

async function mountWith(options: MountOptions = {}): Promise<void> {
  const {
    attrs = '',
    side = 'right',
    body = '<button type="button">Apply</button>',
    title = true,
    description = false,
  } = options;
  document.body.innerHTML = `
    <rafters-sheet ${attrs}>
      <button type="button" data-part="trigger" id="s-trigger">Open</button>
      <div data-part="overlay" id="s-overlay" hidden></div>
      <div data-part="content" id="s-content" data-side="${side}" class="${sheetContentClasses(side)}" tabindex="-1" hidden>
        ${title ? '<h2 data-part="title" id="s-title">Filters</h2>' : ''}
        ${description ? '<div data-part="description" id="s-description">Refine.</div>' : ''}
        ${body}
        <button type="button" data-part="close" id="s-close">Close</button>
      </div>
    </rafters-sheet>`;
  await Promise.resolve();
}

const partIds = {
  trigger: 's-trigger',
  overlay: 's-overlay',
  content: 's-content',
  title: 's-title',
  description: '',
  close: 's-close',
};

const modalConfig: SheetConfig = { modal: true, defaultOpen: false };

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

it('applies the closed-state projection after connect', async () => {
  await mountWith();
  const state = sheet.initialState(modalConfig);
  const aria = sheet.aria(state, modalConfig, partIds);
  const trigger = el('s-trigger');
  expect(trigger.getAttribute('aria-expanded')).toBe(aria.trigger?.['aria-expanded']);
  expect(trigger.getAttribute('data-state')).toBe('closed');
  expect(trigger.hasAttribute('aria-controls')).toBe(false);
  expect(el('s-content').hidden).toBe(true);
});

it('applies the open-state projection after a trigger click', async () => {
  await mountWith();
  el('s-trigger').click();
  const content = el('s-content');
  expect(el('s-trigger').getAttribute('aria-controls')).toBe('s-content');
  expect(content.getAttribute('role')).toBe('dialog');
  expect(content.getAttribute('aria-modal')).toBe('true');
  expect(content.hidden).toBe(false);
});

it('applies the class set to overlay, title, description and close', async () => {
  await mountWith({ description: true });
  const classes = sheetClasses(modalConfig, { open: false });
  expect(el('s-overlay').className).toBe(classes.overlay);
  expect(el('s-title').className).toBe(classes.title);
  expect(el('s-description').className).toBe(classes.description);
  expect(el('s-close').className).toBe(classes.close);
});

for (const side of ['top', 'right', 'bottom', 'left'] as const) {
  it(`leaves the authored ${side} side class and data-side alone`, async () => {
    await mountWith({ side });
    const content = el('s-content');
    const check = () => {
      expect(content.className).toBe(sheetContentClasses(side));
      expect(content.getAttribute('data-side')).toBe(side);
    };
    check();
    el('s-trigger').click();
    check();
    el('s-close').click();
    check();
  });
}

it('references the title and projects no description reference when absent', async () => {
  await mountWith();
  el('s-trigger').click();
  const content = el('s-content');
  expect(content.getAttribute('aria-labelledby')).toBe('s-title');
  expect(content.hasAttribute('aria-describedby')).toBe(false);
});

it('Escape closes when the trap lands focus on the close button', async () => {
  await mountWith({ body: '' });
  el('s-trigger').click();
  const close = el('s-close');
  expect(document.activeElement).toBe(close);
  close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(el('s-content').hidden).toBe(true);
  expect(document.activeElement).toBe(el('s-trigger'));
});

it('the close button closes the sheet', async () => {
  await mountWith();
  el('s-trigger').click();
  el('s-close').click();
  expect(el('s-content').hidden).toBe(true);
});

it('modal: Tab wraps inside the content, scroll is locked, outside pointerdown closes', async () => {
  await mountWith();
  el('s-trigger').click();
  const close = el('s-close');
  close.focus();
  close.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
  );
  expect(el('s-content').contains(document.activeElement)).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(el('s-content').hidden).toBe(true);
  expect(document.body.style.overflow).not.toBe('hidden');
});

it('clicking the trigger while open closes and stays closed', async () => {
  await mountWith();
  el('s-trigger').click();
  el('s-trigger').dispatchEvent(new Event('pointerdown', { bubbles: true }));
  el('s-trigger').click();
  expect(el('s-content').hidden).toBe(true);
});

it('modal="false" has no aria-modal, no scroll lock, and Escape still closes', async () => {
  await mountWith({ attrs: 'modal="false"' });
  el('s-trigger').click();
  const content = el('s-content');
  expect(content.hasAttribute('aria-modal')).toBe(false);
  expect(document.body.style.overflow).not.toBe('hidden');
  el('s-close').focus();
  el('s-close').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(content.hidden).toBe(true);
});

it('default-open="true" mounts open', async () => {
  await mountWith({ attrs: 'default-open="true"' });
  expect(el('s-content').hidden).toBe(false);
  expect(el('s-trigger').getAttribute('aria-expanded')).toBe('true');
});

it('removal runs the teardown', async () => {
  await mountWith({ attrs: 'default-open="true"' });
  const content = el('s-content');
  const sheetEl = document.querySelector('rafters-sheet');
  expect(document.body.style.overflow).toBe('hidden');
  sheetEl?.remove();
  expect(document.body.style.overflow).not.toBe('hidden');
  document.body.append(content);
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(content.hidden).toBe(false);
});

it('has no shadow root', async () => {
  await mountWith();
  expect(document.querySelector('rafters-sheet')?.shadowRoot).toBeNull();
});
