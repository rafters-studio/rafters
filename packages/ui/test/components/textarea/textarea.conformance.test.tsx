/**
 * React performance of the textarea score, driven end to end. The shadcn
 * Textarea surface: a lone <textarea> that spreads props, composes onChange,
 * and adds the score's controlled value + validity projection.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Textarea } from '../../../src/components/textarea/textarea';
import { textareaBehavior } from '../../../src/components/textarea/textarea.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

const areaOf = (host: HTMLElement) => partElement(host, 'textarea') as HTMLTextAreaElement;

describe('textarea conformance [react]', () => {
  it('valid: renders collapsed validity and is axe-clean', async () => {
    const { container } = render(<Textarea aria-label="Message" />);
    const config = { invalid: undefined, required: undefined };
    const state = { value: '' };
    assertContractFulfillment(textareaBehavior, container, state, config, ['textarea']);
    const el = areaOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('false');
    expect(el.hasAttribute('aria-describedby')).toBe(false);
    await assertAxeClean(container);
  });

  it('invalid: aria-invalid true and wired to the error id, axe-clean', async () => {
    const { container } = render(
      <div>
        <Textarea aria-label="Message" invalid errorId="err" />
        <div data-part="error" id="err">
          Required
        </div>
      </div>,
    );
    const state = { value: '' };
    assertContractFulfillment(textareaBehavior, container, state, { invalid: true }, [
      'textarea',
      'error',
    ]);
    const el = areaOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('err');
    expect(el.getAttribute('data-state')).toBe('invalid');
    await assertAxeClean(container);
  });

  it('required projects aria-required', () => {
    const { container } = render(<Textarea aria-label="Message" required />);
    expect(areaOf(container).getAttribute('aria-required')).toBe('true');
  });

  it('uncontrolled: typing moves the value and fires onValueChange per edit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <Textarea aria-label="Message" defaultValue="" onValueChange={onValueChange} />,
    );
    const el = areaOf(container);
    await user.type(el, 'ab');
    expect(el.value).toBe('ab');
    expect(onValueChange).toHaveBeenLastCalledWith('ab');
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });

  it('accepts multi-line input including newlines', async () => {
    const user = userEvent.setup();
    const { container } = render(<Textarea aria-label="Message" defaultValue="" />);
    const el = areaOf(container);
    await user.type(el, 'one{Enter}two');
    expect(el.value).toBe('one\ntwo');
  });

  it('controlled: the value follows the prop, the callback reports the intended edit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container, rerender } = render(
      <Textarea aria-label="Message" value="one" onValueChange={onValueChange} />,
    );
    const el = areaOf(container);
    expect(el.value).toBe('one');

    // Typing does not move the effective value (config pins it) but the
    // callback fires with the value the consumer should adopt next.
    await user.type(el, 'X');
    expect(onValueChange).toHaveBeenLastCalledWith('oneX');
    expect(el.value).toBe('one');

    rerender(<Textarea aria-label="Message" value="two" onValueChange={onValueChange} />);
    expect(el.value).toBe('two');
  });

  it('disabled and read-only gate edits', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const disabled = render(<Textarea aria-label="D" disabled onValueChange={onValueChange} />);
    await user.type(areaOf(disabled.container), 'x');
    expect(areaOf(disabled.container).value).toBe('');
    expect(onValueChange).not.toHaveBeenCalled();
    cleanup();

    const readonly = render(<Textarea aria-label="R" readOnly onValueChange={onValueChange} />);
    await user.type(areaOf(readonly.container), 'x');
    expect(areaOf(readonly.container).value).toBe('');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('is a drop-in <textarea>: passes through props and composes the consumer onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <Textarea
        aria-label="Message"
        placeholder="Type here..."
        name="message"
        rows={5}
        onChange={onChange}
      />,
    );
    const el = areaOf(container);
    expect(el.placeholder).toBe('Type here...');
    expect(el.name).toBe('message');
    expect(el.getAttribute('rows')).toBe('5');
    await user.type(el, 'a');
    expect(onChange).toHaveBeenCalled();
    expect(el.value).toBe('a');
  });
});
