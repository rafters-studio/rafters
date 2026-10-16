/**
 * Web Component performance of the input-otp score: the element renders the
 * parts, classes and ARIA; the bind (unchanged) does the typing.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_OTP_MAX_LENGTH,
  inputOtpBehavior,
  otpSlotAttrs,
  slotState,
  type InputOtpConfig,
  type InputOtpState,
} from '../../../src/components/input-otp/input-otp.behavior';
import { inputOtpClassSet } from '../../../src/components/input-otp/input-otp.classes';
import {
  RaftersInputOtp,
  RaftersInputOtpSlot,
} from '../../../src/components/input-otp/input-otp.element';

const IDS = { root: '', input: '', group: '', slot: '', separator: '' };

const SIX_SLOTS =
  '<rafters-input-otp-group>' +
  [0, 1, 2].map((i) => `<rafters-input-otp-slot index="${i}"></rafters-input-otp-slot>`).join('') +
  '</rafters-input-otp-group><rafters-input-otp-separator></rafters-input-otp-separator>' +
  '<rafters-input-otp-group>' +
  [3, 4, 5].map((i) => `<rafters-input-otp-slot index="${i}"></rafters-input-otp-slot>`).join('') +
  '</rafters-input-otp-group>';

async function mount(attrs = '', children = SIX_SLOTS): Promise<HTMLElement> {
  document.body.innerHTML = `<form><rafters-input-otp ${attrs}>${children}</rafters-input-otp></form>`;
  await Promise.resolve();
  return document.querySelector<HTMLElement>('rafters-input-otp [data-part="root"]') as HTMLElement;
}

function parts(root: HTMLElement) {
  return {
    field: root.querySelector<HTMLInputElement>('[data-part="input"]') as HTMLInputElement,
    slots: [...root.querySelectorAll<HTMLElement>('[data-part="slot"]')],
  };
}

function expectProjection(root: HTMLElement, config: InputOtpConfig, state: InputOtpState): void {
  const { field, slots } = parts(root);
  const classes = inputOtpClassSet(config, state);
  const aria = inputOtpBehavior.aria(state, config, IDS);
  expect(root.className).toBe(classes.root);
  expect(field.className).toBe(classes.input);
  for (const [el, attrs] of [
    [root, aria.root],
    [field, aria.input],
  ] as const) {
    for (const [name, value] of Object.entries(attrs ?? {})) {
      if (value === undefined) expect(el.hasAttribute(name)).toBe(false);
      else expect(el.getAttribute(name)).toBe(String(value));
    }
  }
  for (const [index, slotEl] of slots.entries()) {
    expect(slotEl.className).toBe(classes.slot);
    for (const [name, value] of Object.entries(otpSlotAttrs(String(index), state, config))) {
      if (value === undefined) expect(slotEl.hasAttribute(name)).toBe(false);
      else expect(slotEl.getAttribute(name)).toBe(String(value));
    }
    const expected = slotState(index, state, config);
    const char = slotEl.querySelector<HTMLElement>('[data-otp-char]') as HTMLElement;
    const caret = slotEl.querySelector<HTMLElement>('[data-otp-caret]') as HTMLElement;
    expect(char.className).toBe(classes.char);
    expect(char.textContent).toBe(expected.char);
    expect(caret.className).toBe(classes.caret);
    expect(caret.hidden).toBe(!expected.caret);
    expect(caret.firstElementChild?.className).toBe(classes.caretBar);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('input-otp [wc]', () => {
  it('upgrades in light DOM with the named input', async () => {
    document.body.innerHTML = '<rafters-input-otp></rafters-input-otp>';
    await Promise.resolve();
    const host = document.querySelector('rafters-input-otp') as HTMLElement;
    expect(host).toBeInstanceOf(RaftersInputOtp);
    expect(host.shadowRoot).toBeNull();
    const fields = host.querySelectorAll('input[data-part="input"]');
    expect(fields).toHaveLength(1);
    expect(fields[0]?.getAttribute('aria-label')).toBe('Enter 6 character code');
    expect(host.querySelector('[data-part="root"]')).not.toBeNull();
  });

  it('renders group, slot and separator parts with char and caret spans', async () => {
    const root = await mount();
    expect(root.firstElementChild?.getAttribute('data-part')).toBe('input');
    expect(root.querySelectorAll('[data-part="group"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-part="separator"]')).toHaveLength(1);
    expect(root.querySelector('[data-part="separator"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('[data-part="separator"]')?.textContent).toBe('-');
    const { slots } = parts(root);
    expect(slots).toHaveLength(6);
    expect(slots[0]).toBeInstanceOf(RaftersInputOtpSlot);
    for (const slot of slots) {
      expect(slot.querySelector('[data-otp-char]')).not.toBeNull();
      expect(slot.querySelector('[data-otp-caret][aria-hidden="true"]')).not.toBeNull();
    }
  });

  const scenarios: Array<{
    name: string;
    attrs: string;
    typed: string;
    config: InputOtpConfig;
  }> = [
    { name: 'empty', attrs: '', typed: '', config: { maxLength: DEFAULT_OTP_MAX_LENGTH } },
    { name: 'two typed', attrs: '', typed: '12', config: { maxLength: DEFAULT_OTP_MAX_LENGTH } },
    {
      name: 'six typed',
      attrs: '',
      typed: '123456',
      config: { maxLength: DEFAULT_OTP_MAX_LENGTH },
    },
    {
      name: 'disabled',
      attrs: 'disabled',
      typed: '',
      config: { maxLength: DEFAULT_OTP_MAX_LENGTH, disabled: true },
    },
    {
      name: 'required',
      attrs: 'required',
      typed: '',
      config: { maxLength: DEFAULT_OTP_MAX_LENGTH, required: true },
    },
    {
      name: 'aria-label',
      attrs: 'aria-label="Code"',
      typed: '',
      config: { maxLength: DEFAULT_OTP_MAX_LENGTH, label: 'Code' },
    },
  ];

  for (const scenario of scenarios) {
    it(`classes, ARIA and slot paint match the score: ${scenario.name}`, async () => {
      const root = await mount(scenario.attrs);
      const { field } = parts(root);
      if (scenario.typed) await userEvent.type(field, scenario.typed);
      const state = inputOtpBehavior.initialState(scenario.config);
      const typedState = scenario.typed ? { ...state, value: scenario.typed } : state;
      const active = scenario.typed
        ? {
            ...typedState,
            activeIndex: Math.min(scenario.typed.length, DEFAULT_OTP_MAX_LENGTH - 1),
          }
        : typedState;
      expectProjection(root, scenario.config, active);
    });
  }

  it('refuses a character the pattern refuses', async () => {
    const { field } = parts(await mount());
    await userEvent.type(field, 'a1');
    expect(field.value).toBe('1');
  });

  it('splits a paste across the slots', async () => {
    const { field } = parts(await mount());
    field.focus();
    await userEvent.paste('12-34-56');
    expect(field.value).toBe('123456');
  });

  it('moves the lit slot with arrows while the input keeps focus', async () => {
    const root = await mount();
    const { field, slots } = parts(root);
    await userEvent.type(field, '12');
    expect(slots[2]?.getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(slots[1]?.getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{ArrowRight}');
    expect(slots[2]?.getAttribute('data-active')).toBe('true');
    expect(document.activeElement).toBe(field);
  });

  it('a disabled field refuses typing, paste and arrows', async () => {
    const root = await mount('disabled');
    const { field, slots } = parts(root);
    await userEvent.type(field, '12');
    field.focus();
    await userEvent.paste('123456');
    await userEvent.keyboard('{ArrowRight}');
    expect(field.value).toBe('');
    expect(slots.every((s) => s.getAttribute('data-filled') === null)).toBe(true);
  });

  it('dispatches input per change and complete once on the edge', async () => {
    const root = await mount();
    const { field } = parts(root);
    const seen: string[] = [];
    let detail: unknown;
    for (const type of ['input', 'change', 'rafters-otp-complete']) {
      root.addEventListener(type, (e) => {
        if (e.target !== root) return;
        seen.push(type);
        if (e instanceof CustomEvent) detail = e.detail;
      });
    }
    await userEvent.type(field, '123456');
    expect(seen.filter((t) => t === 'input')).toHaveLength(6);
    expect(seen.filter((t) => t === 'change')).toHaveLength(1);
    expect(seen.filter((t) => t === 'rafters-otp-complete')).toHaveLength(1);
    expect(detail).toEqual({ value: '123456' });
    await userEvent.keyboard('{ArrowLeft}');
    await userEvent.keyboard('6');
    expect(seen.filter((t) => t === 'change')).toHaveLength(1);
    expect(seen.filter((t) => t === 'rafters-otp-complete')).toHaveLength(1);
  });

  it('submits the native field value and no hidden mirror', async () => {
    const root = await mount('name="code"');
    const { field } = parts(root);
    await userEvent.type(field, '123456');
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('code')).toEqual(['123456']);
    expect(document.querySelector('rafters-input-otp input[type="hidden"]')).toBeNull();
  });

  it('a disabled field submits nothing', async () => {
    await mount('name="code" disabled');
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('code')).toEqual([]);
  });

  it('survives remove and re-add with one input and working typing', async () => {
    await mount();
    const host = document.querySelector('rafters-input-otp') as HTMLElement;
    const form = host.parentElement as HTMLElement;
    host.remove();
    form.append(host);
    await Promise.resolve();
    expect(host.querySelectorAll('input')).toHaveLength(1);
    const field = host.querySelector('input') as HTMLInputElement;
    await userEvent.type(field, '12');
    expect(field.value).toBe('12');
    expect(host.querySelectorAll('[data-part="slot"]')[1]?.getAttribute('data-filled')).toBe(
      'true',
    );
  });

  it('never throws on a bad maxLength or pattern', async () => {
    const root = await mount('maxLength="abc" pattern="["');
    const { field } = parts(root);
    expect(field.maxLength).toBe(DEFAULT_OTP_MAX_LENGTH);
    await userEvent.type(field, '1a');
    expect(field.value).toBe('1');
  });
});
