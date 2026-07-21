/**
 * React performance of the input-otp score, driven end to end. The oracle's
 * compound surface (InputOTP + Group/Slot/Separator) over one real input.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputOTP } from '../../../src/components/input-otp/input-otp';
import { inputOtpBehavior } from '../../../src/components/input-otp/input-otp.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
  partElements,
} from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

function Field(props: React.ComponentProps<typeof InputOTP>): React.JSX.Element {
  const { children, ...rest } = props;
  return (
    <InputOTP maxLength={6} {...rest}>
      <InputOTP.Group>
        <InputOTP.Slot index={0} />
        <InputOTP.Slot index={1} />
        <InputOTP.Slot index={2} />
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        <InputOTP.Slot index={3} />
        <InputOTP.Slot index={4} />
        <InputOTP.Slot index={5} />
      </InputOTP.Group>
      {children}
    </InputOTP>
  );
}

const inputOf = (host: HTMLElement) => partElement(host, 'input') as HTMLInputElement;

describe('input-otp conformance [react]', () => {
  it('empty: every declared part renders, the projection matches, axe is clean', async () => {
    const { container } = render(<Field />);
    const config = { maxLength: 6 };
    const state = { value: '', activeIndex: 0 };
    assertContractFulfillment(inputOtpBehavior, container, state, config, [
      'root',
      'input',
      'group',
      'slot',
      'separator',
    ]);
    assertInstanceAriaFulfillment(inputOtpBehavior, container, state, config);
    expect(partElements(container, 'slot')).toHaveLength(6);
    await assertAxeClean(container);
  });

  it('names the field by its slot count and offers one-time-code autofill', () => {
    const { container } = render(<Field />);
    const el = inputOf(container);
    expect(el.getAttribute('aria-label')).toBe('Enter 6 character code');
    expect(el.getAttribute('autocomplete')).toBe('one-time-code');
    expect(el.getAttribute('inputmode')).toBe('numeric');
  });

  it('the slots are the only visible surface: no extra tab stops', () => {
    const { container } = render(<Field />);
    for (const slot of partElements(container, 'slot')) {
      expect(slot.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('typing fills slots left to right and advances the caret', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field />);
    await user.type(inputOf(container), '12');
    const slots = partElements(container, 'slot');
    expect(slots[0]?.textContent).toBe('1');
    expect(slots[1]?.textContent).toBe('2');
    expect(slots[0]?.getAttribute('data-filled')).toBe('true');
    expect(slots[2]?.getAttribute('data-active')).toBe('true');
    expect(slots[1]?.hasAttribute('data-active')).toBe(false);
  });

  it('refuses characters the pattern rejects -- they never reach a slot', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Field onChange={onChange} />);
    await user.type(inputOf(container), 'a1b');
    expect(inputOf(container).value).toBe('1');
    expect(partElements(container, 'slot')[0]?.textContent).toBe('1');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('1');
  });

  it('a custom pattern replaces the digit rule', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field pattern={/^[a-z]$/} />);
    await user.type(inputOf(container), 'a1b');
    expect(inputOf(container).value).toBe('ab');
  });

  it('backspace walks back through the code', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field defaultValue="123" />);
    const el = inputOf(container);
    el.focus();
    await user.keyboard('{Backspace}');
    expect(el.value).toBe('12');
    expect(partElements(container, 'slot')[2]?.hasAttribute('data-filled')).toBe(false);
  });

  it('paste splits a whole code across the slots, separators and all', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<Field onComplete={onComplete} />);
    const el = inputOf(container);
    el.focus();
    await user.paste('12-34-56');
    expect(el.value).toBe('123456');
    expect(partElements(container, 'slot').map((slot) => slot.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenLastCalledWith('123456');
  });

  it('a paste longer than maxLength is truncated, not rejected', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field />);
    inputOf(container).focus();
    await user.paste('1234567890');
    expect(inputOf(container).value).toBe('123456');
  });

  it('completion fires once on the edge, and the root reports it', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<Field defaultValue="12345" onComplete={onComplete} />);
    const el = inputOf(container);
    el.focus();
    await user.keyboard('6');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(partElement(container, 'root')?.getAttribute('data-complete')).toBe('true');
    // Deleting and re-typing crosses the edge again -- but staying full does not.
    await user.keyboard('{Backspace}');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('arrows move the lit slot without moving focus or the value', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field defaultValue="123" />);
    const el = inputOf(container);
    el.focus();
    await user.keyboard('{ArrowLeft}');
    const slots = partElements(container, 'slot');
    expect(slots[2]?.getAttribute('data-active')).toBe('true');
    expect(document.activeElement).toBe(el);
    expect(el.value).toBe('123');
    await user.keyboard('{ArrowRight}');
    expect(slots[3]?.getAttribute('data-active')).toBe('true');
  });

  it('a complete code keeps the last slot lit after ArrowLeft (the oracle rule)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field defaultValue="123456" />);
    inputOf(container).focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    const slots = partElements(container, 'slot');
    expect(slots[3]?.getAttribute('data-active')).toBe('true');
    expect(slots[5]?.getAttribute('data-active')).toBe('true');
  });

  it('clicking a slot focuses the real field', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field />);
    await user.click(partElements(container, 'slot')[3] as HTMLElement);
    expect(document.activeElement).toBe(inputOf(container));
  });

  it('controlled: the value follows the prop, the callback reports the intended edit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container, rerender } = render(<Field value="12" onChange={onChange} />);
    const el = inputOf(container);
    expect(el.value).toBe('12');
    await user.type(el, '3');
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(el.value).toBe('12');
    rerender(<Field value="99" onChange={onChange} />);
    expect(el.value).toBe('99');
  });

  it('disabled gates every entry path and projects the state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Field disabled onChange={onChange} />);
    const el = inputOf(container);
    await user.type(el, '123');
    expect(el.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
    expect(partElement(container, 'root')?.getAttribute('data-disabled')).toBe('true');
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });

  it('required and name make it a real form field, no hidden mirror', async () => {
    const { container } = render(<Field required name="code" defaultValue="123456" />);
    const el = inputOf(container);
    expect(el.getAttribute('aria-required')).toBe('true');
    expect(el.name).toBe('code');
    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    await assertAxeClean(container);
  });
});
