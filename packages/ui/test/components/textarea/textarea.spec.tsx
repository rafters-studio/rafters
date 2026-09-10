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
import {
  textareaBehavior,
  type TextareaConfig,
  type TextareaPart,
  type TextareaState,
} from '../../../src/components/textarea/textarea.behavior';

afterEach(() => {
  cleanup();
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Every expected part renders (with its declared role), and the rendered
 *  ARIA equals the score's projection -- including absence: a projected
 *  `undefined` means the attribute must not be rendered. */
function assertContractFulfillment(
  root: HTMLElement,
  state: TextareaState,
  config: TextareaConfig,
  expectedParts: readonly TextareaPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = textareaBehavior.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }
  const allParts = Object.keys(textareaBehavior.parts) as TextareaPart[];
  const ids = {} as Record<TextareaPart, string>;
  for (const part of allParts) ids[part] = partElement(root, part)?.id ?? '';
  const projection = textareaBehavior.aria(state, config, ids);
  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

const areaOf = (host: HTMLElement) => partElement(host, 'textarea') as HTMLTextAreaElement;

describe('textarea conformance [react]', () => {
  it('valid: renders collapsed validity', () => {
    const { container } = render(<Textarea aria-label="Message" />);
    const config: TextareaConfig = { invalid: undefined, required: undefined };
    const state: TextareaState = { value: '' };
    assertContractFulfillment(container, state, config, ['textarea']);
    const el = areaOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('false');
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('invalid: aria-invalid true and wired to the error id', () => {
    const { container } = render(
      <div>
        <Textarea aria-label="Message" invalid errorId="err" />
        <div data-part="error" id="err">
          Required
        </div>
      </div>,
    );
    const state: TextareaState = { value: '' };
    assertContractFulfillment(container, state, { invalid: true }, ['textarea', 'error']);
    const el = areaOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('err');
    expect(el.getAttribute('data-state')).toBe('invalid');
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
