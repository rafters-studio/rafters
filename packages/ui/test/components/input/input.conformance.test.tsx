/**
 * React performance of the input score, driven end to end. The shadcn Input
 * surface: a lone <input> that spreads props, composes onChange, and adds the
 * score's controlled value + validity projection.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../../src/components/input/input';
import { inputBehavior } from '../../../src/components/input/input.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

const inputOf = (host: HTMLElement) => partElement(host, 'input') as HTMLInputElement;

describe('input conformance [react]', () => {
  it('valid: renders collapsed validity and is axe-clean', async () => {
    const { container } = render(<Input aria-label="Name" />);
    const config = { invalid: undefined, required: undefined };
    const state = { value: '' };
    assertContractFulfillment(inputBehavior, container, state, config, ['input']);
    const el = inputOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('false');
    expect(el.hasAttribute('aria-describedby')).toBe(false);
    await assertAxeClean(container);
  });

  it('invalid: aria-invalid true and wired to the error id, axe-clean', async () => {
    const { container } = render(
      <div>
        <Input aria-label="Name" invalid errorId="err" />
        <div data-part="error" id="err">
          Required
        </div>
      </div>,
    );
    const state = { value: '' };
    assertContractFulfillment(inputBehavior, container, state, { invalid: true }, [
      'input',
      'error',
    ]);
    const el = inputOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('err');
    expect(el.getAttribute('data-state')).toBe('invalid');
    await assertAxeClean(container);
  });

  it('required projects aria-required', () => {
    const { container } = render(<Input aria-label="Name" required />);
    expect(inputOf(container).getAttribute('aria-required')).toBe('true');
  });

  it('uncontrolled: typing moves the value and fires onValueChange per edit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <Input aria-label="Name" defaultValue="" onValueChange={onValueChange} />,
    );
    const el = inputOf(container);
    await user.type(el, 'ab');
    expect(el.value).toBe('ab');
    expect(onValueChange).toHaveBeenLastCalledWith('ab');
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('controlled: the value follows the prop, the callback reports the intended edit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container, rerender } = render(
      <Input aria-label="Name" value="one" onValueChange={onValueChange} />,
    );
    const el = inputOf(container);
    expect(el.value).toBe('one');

    // Typing does not move the effective value (config pins it) but the
    // callback fires with the value the consumer should adopt next.
    await user.type(el, 'X');
    expect(onValueChange).toHaveBeenLastCalledWith('oneX');
    expect(el.value).toBe('one');

    rerender(<Input aria-label="Name" value="two" onValueChange={onValueChange} />);
    expect(el.value).toBe('two');
  });

  it('disabled and read-only gate edits', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const disabled = render(<Input aria-label="D" disabled onValueChange={onValueChange} />);
    await user.type(inputOf(disabled.container), 'x');
    expect(inputOf(disabled.container).value).toBe('');
    expect(onValueChange).not.toHaveBeenCalled();
    cleanup();

    const readonly = render(<Input aria-label="R" readOnly onValueChange={onValueChange} />);
    await user.type(inputOf(readonly.container), 'x');
    expect(inputOf(readonly.container).value).toBe('');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('is a drop-in <input>: passes through props and composes the consumer onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <Input
        aria-label="Name"
        type="email"
        placeholder="you@x.com"
        name="email"
        onChange={onChange}
      />,
    );
    const el = inputOf(container);
    expect(el.type).toBe('email');
    expect(el.placeholder).toBe('you@x.com');
    expect(el.name).toBe('email');
    await user.type(el, 'a');
    expect(onChange).toHaveBeenCalled();
    expect(el.value).toBe('a');
  });
});
