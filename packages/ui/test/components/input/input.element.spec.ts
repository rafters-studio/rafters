/**
 * WC performance of the input score, driven end to end against light-DOM
 * markup. Same score as the React spec -- proves value-sync and
 * the validity projection (including the aria-invalid="false" that only lands
 * because the bind applies with {validate:false}) through the DOM binding.
 * `input.element.ts` self-registers `rafters-input` on import, guarded, so no
 * explicit customElements.define is needed here.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../../src/components/input/input.element';
import { installIconLayout, ICON_SVG_16, rectsOf } from './icon-layout';

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-input') as HTMLElement;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('input [wc]', () => {
  it('valid: projects aria-invalid="false" literally (validate:false, not coerced truthy)', async () => {
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" /></rafters-input>`,
    );
    expect(input().getAttribute('aria-invalid')).toBe('false');
    expect(input().getAttribute('data-state')).toBe('default');
    expect(input().hasAttribute('aria-describedby')).toBe(false);
  });

  it('invalid: aria-invalid true, wired to the error id', async () => {
    await mount(
      `<rafters-input>
        <input data-part="input" id="i" aria-label="Name" aria-invalid="true" value="" />
        <div data-part="error" id="i-error">Required</div>
      </rafters-input>`,
    );
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('i-error');
    expect(input().getAttribute('data-state')).toBe('invalid');
  });

  it('typing moves the value (native input owns the caret)', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" /></rafters-input>`,
    );
    await user.type(input(), 'abc');
    expect(input().value).toBe('abc');
  });

  it('disabled: typing is refused', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="" disabled /></rafters-input>`,
    );
    await user.type(input(), 'x');
    expect(input().value).toBe('');
  });

  it('read-only: typing is refused', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input><input data-part="input" id="i" aria-label="Name" value="seed" readonly /></rafters-input>`,
    );
    await user.type(input(), 'x');
    expect(input().value).toBe('seed');
  });
});

describe('input icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const markup = (before: string, after: string) =>
    `<rafters-input>${before}<input data-part="input" id="i" aria-label="Search" value="" />${after}</rafters-input>`;
  const rowOf = () => document.body.querySelector<HTMLElement>('[data-part="row"]') as HTMLElement;

  it('slot="start-icon" and slot="end-icon" children become hidden wrappers beside the field', async () => {
    await mount(
      markup(
        `<span slot="start-icon">${ICON_SVG_16}</span>`,
        `<span slot="end-icon">${ICON_SVG_16}</span>`,
      ),
    );
    for (const part of ['startIcon', 'endIcon']) {
      expect(document.querySelector(`[data-part="${part}"]`)?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
    const r = rectsOf(rowOf());
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.field.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.field.right - 0.5);
    expect(r.start?.width).toBe(16);
  });

  it('start-only and end-only each render beside the field', async () => {
    await mount(markup(`<span slot="start-icon">${ICON_SVG_16}</span>`, ''));
    expect(document.querySelector('[data-part="endIcon"]')).toBeNull();
    expect(rectsOf(rowOf()).start).not.toBeNull();
    document.body.innerHTML = '';
    await mount(markup('', `<span slot="end-icon">${ICON_SVG_16}</span>`));
    expect(document.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(rectsOf(rowOf()).end).not.toBeNull();
  });

  it('on a dir="rtl" page the start icon renders on the right of the field', async () => {
    document.documentElement.dir = 'rtl';
    await mount(markup(`<span slot="start-icon">${ICON_SVG_16}</span>`, ''));
    const r = rectsOf(rowOf());
    expect((r.start as DOMRect).left).toBeGreaterThan(r.field.left);
  });

  it('no row and no wrapper without an icon child; typing still works with one', async () => {
    await mount(markup('', ''));
    expect(document.querySelector('[data-part="row"]')).toBeNull();
    expect(document.querySelector('[data-part="startIcon"]')).toBeNull();
    document.body.innerHTML = '';
    await mount(markup(`<span slot="start-icon">${ICON_SVG_16}</span>`, ''));
    const user = userEvent.setup();
    await user.type(input(), 'hi');
    expect(input().value).toBe('hi');
  });
});
