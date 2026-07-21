/**
 * WC performance of the input-otp score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves the filter, the
 * active-slot rule, paste and the completion edge through the DOM binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaftersInputOtp } from '../../../src/components/input-otp/input-otp.element';
import { inputOtpBehavior } from '../../../src/components/input-otp/input-otp.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElements,
} from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-input-otp')) {
    customElements.define('rafters-input-otp', RaftersInputOtp);
  }
});

interface MarkupOptions {
  maxLength?: number;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  pattern?: string;
  name?: string;
}

function markup(options: MarkupOptions = {}): string {
  const { maxLength = 6, value = '', disabled = false, required = false, pattern, name } = options;
  const slots = Array.from(
    { length: maxLength },
    (_, index) =>
      `<div data-part="slot" data-value="${index}">` +
      `<span data-otp-char></span>` +
      `<span data-otp-caret aria-hidden="true" hidden></span>` +
      `</div>`,
  ).join('');
  return `<rafters-input-otp>
    <div data-part="root" data-max-length="${maxLength}"${pattern ? ` data-pattern="${pattern}"` : ''}>
      <input data-part="input" type="text" inputmode="numeric" autocomplete="one-time-code"
        aria-label="Enter ${maxLength} character code" value="${value}"
        ${name ? `name="${name}"` : ''} ${disabled ? 'disabled' : ''} ${required ? 'required' : ''} />
      <div data-part="group">${slots}</div>
    </div>
  </rafters-input-otp>`;
}

async function mount(options: MarkupOptions = {}): Promise<HTMLElement> {
  document.body.innerHTML = markup(options);
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
}

const input = () => document.body.querySelector<HTMLInputElement>('input[data-part="input"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('input-otp conformance [wc]', () => {
  it('empty: the projection matches the rendered DOM and axe is clean', async () => {
    const root = await mount();
    const config = { maxLength: 6 };
    const state = { value: '', activeIndex: 0 };
    assertContractFulfillment(inputOtpBehavior, root, state, config, [
      'root',
      'input',
      'group',
      'slot',
    ]);
    assertInstanceAriaFulfillment(inputOtpBehavior, root, state, config);
    await assertAxeClean(root);
  });

  it('seeds the value from the server markup and paints the slots on first bind', async () => {
    const root = await mount({ value: '123' });
    const slots = partElements(root, 'slot');
    expect(slots.map((slot) => slot.textContent)).toEqual(['1', '2', '3', '', '', '']);
    expect(slots[0]?.getAttribute('data-filled')).toBe('true');
    expect(slots[3]?.getAttribute('data-active')).toBe('true');
  });

  it('typing fills slots and advances the caret', async () => {
    const user = userEvent.setup();
    const root = await mount();
    await user.type(input(), '12');
    const slots = partElements(root, 'slot');
    expect(slots[1]?.textContent).toBe('2');
    expect(slots[2]?.getAttribute('data-active')).toBe('true');
  });

  it('refuses characters the pattern rejects and reverts the field', async () => {
    const user = userEvent.setup();
    const root = await mount();
    await user.type(input(), 'a1b');
    expect(input().value).toBe('1');
    expect(partElements(root, 'slot')[0]?.textContent).toBe('1');
  });

  it('a data-pattern attribute replaces the digit rule', async () => {
    const user = userEvent.setup();
    await mount({ pattern: '^[a-z]$' });
    await user.type(input(), 'a1b');
    expect(input().value).toBe('ab');
  });

  it('paste splits a whole code across the slots and fires the completion events', async () => {
    const user = userEvent.setup();
    const root = await mount();
    const onChange = vi.fn();
    const onComplete = vi.fn();
    root.addEventListener('change', onChange);
    root.addEventListener('rafters-otp-complete', onComplete);
    input().focus();
    await user.paste('12-34-56');
    expect(input().value).toBe('123456');
    expect(partElements(root, 'slot').map((slot) => slot.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(root.getAttribute('data-complete')).toBe('true');
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onComplete.mock.calls[0]?.[0] as CustomEvent<{ value: string }>;
    expect(event.detail.value).toBe('123456');
  });

  it('the completion event fires on the EDGE, not on every full-code edit', async () => {
    const user = userEvent.setup();
    const root = await mount({ value: '12345' });
    const onComplete = vi.fn();
    root.addEventListener('rafters-otp-complete', onComplete);
    input().focus();
    await user.keyboard('6');
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Already full: a further keystroke is truncated away, so no second edge.
    await user.keyboard('7');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('backspace deletes through the native field and repaints the slots', async () => {
    const user = userEvent.setup();
    const root = await mount({ value: '123' });
    input().focus();
    await user.keyboard('{Backspace}');
    expect(input().value).toBe('12');
    expect(partElements(root, 'slot')[2]?.hasAttribute('data-filled')).toBe(false);
  });

  it('arrows move the lit slot without moving focus', async () => {
    const user = userEvent.setup();
    const root = await mount({ value: '123' });
    input().focus();
    await user.keyboard('{ArrowLeft}');
    expect(partElements(root, 'slot')[2]?.getAttribute('data-active')).toBe('true');
    expect(document.activeElement).toBe(input());
  });

  it('a complete code keeps the last slot lit after ArrowLeft (the oracle rule)', async () => {
    const user = userEvent.setup();
    const root = await mount({ value: '123456' });
    input().focus();
    await user.keyboard('{ArrowLeft}');
    const slots = partElements(root, 'slot');
    expect(slots[4]?.getAttribute('data-active')).toBe('true');
    expect(slots[5]?.getAttribute('data-active')).toBe('true');
  });

  it('clicking a slot focuses the real field', async () => {
    const user = userEvent.setup();
    const root = await mount();
    await user.click(partElements(root, 'slot')[2] as HTMLElement);
    expect(document.activeElement).toBe(input());
  });

  it('disabled projects the state and refuses entry', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true });
    expect(root.getAttribute('data-disabled')).toBe('true');
    expect(input().getAttribute('aria-disabled')).toBe('true');
    await user.type(input(), '123');
    expect(input().value).toBe('');
  });

  it('required projects aria-required and the field submits natively by name', async () => {
    const root = await mount({ required: true, name: 'code' });
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(input().name).toBe('code');
    expect(root.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });

  it('disconnecting tears the binding down: the slots stop tracking', async () => {
    const root = await mount();
    const field = input();
    const host = document.body.querySelector('rafters-input-otp') as HTMLElement;
    host.remove();

    // Drive the detached field directly -- the teardown removed the listener,
    // so nothing repaints the slots.
    field.value = '1';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(partElements(root, 'slot')[0]?.textContent).toBe('');
  });
});
