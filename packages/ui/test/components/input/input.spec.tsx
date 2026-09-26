/**
 * Browser-project performance of the input score, driven end to end. The
 * shadcn Input surface: a lone <input> that spreads props, composes onChange,
 * and adds the score's controlled value + validity projection.
 */
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { Input } from '../../../src/components/input/input';
import {
  inputBehavior,
  type InputConfig,
  type InputPart,
  type InputState,
} from '../../../src/components/input/input.behavior';

afterEach(async () => {
  await cleanup();
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

const inputOf = (host: HTMLElement) => partElement(host, 'input') as HTMLInputElement;

/**
 * Fulfils the contract: every expected part is rendered, and the FULL aria
 * projection for the `input` part matches what `inputBehavior.aria` computes
 * for the same config -- including every attribute a projected `undefined`
 * says must be ABSENT (aria-required, aria-describedby).
 */
function assertContract(
  root: HTMLElement,
  state: InputState,
  config: InputConfig,
  expectedParts: ReadonlyArray<InputPart>,
): void {
  for (const part of expectedParts) {
    expect(partElement(root, part), `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const ids = {} as Record<InputPart, string>;
  for (const part of Object.keys(inputBehavior.parts) as InputPart[]) {
    ids[part] = partElement(root, part)?.id ?? '';
  }
  const projection = inputBehavior.aria(state, config, ids);
  for (const part of expectedParts) {
    const el = partElement(root, part);
    const attrs = projection[part];
    if (!attrs || !el) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr)).toBe(String(value));
      }
    }
  }
}

describe('input [react]', () => {
  it('valid: renders collapsed validity', async () => {
    const { container } = await render(<Input aria-label="Name" />);
    assertContract(container, { value: '' }, { invalid: undefined, required: undefined }, [
      'input',
    ]);
    const el = inputOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('false');
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('invalid: aria-invalid true and wired to the error id', async () => {
    const { container } = await render(
      <div>
        <Input aria-label="Name" invalid errorId="err" />
        <div data-part="error" id="err">
          Required
        </div>
      </div>,
    );
    assertContract(container, { value: '' }, { invalid: true }, ['input', 'error']);
    const el = inputOf(container);
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('err');
    expect(el.getAttribute('data-state')).toBe('invalid');
  });

  it('required projects aria-required', async () => {
    const { container } = await render(<Input aria-label="Name" required />);
    expect(inputOf(container).getAttribute('aria-required')).toBe('true');
  });

  it('uncontrolled: typing moves the value and fires onValueChange per edit', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = await render(
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
    const { container, rerender } = await render(
      <Input aria-label="Name" value="one" onValueChange={onValueChange} />,
    );
    const el = inputOf(container);
    expect(el.value).toBe('one');

    // Typing does not move the effective value (config pins it) but the
    // callback fires with the value the consumer should adopt next.
    await user.type(el, 'X');
    expect(onValueChange).toHaveBeenLastCalledWith('oneX');
    expect(el.value).toBe('one');

    await rerender(<Input aria-label="Name" value="two" onValueChange={onValueChange} />);
    expect(el.value).toBe('two');
  });

  it('disabled and read-only gate edits', async () => {
    const user = userEvent.setup();
    const onValueChangeA = vi.fn();
    const disabled = await render(<Input aria-label="D" disabled onValueChange={onValueChangeA} />);
    await user.type(inputOf(disabled.container), 'x');
    expect(inputOf(disabled.container).value).toBe('');
    expect(onValueChangeA).not.toHaveBeenCalled();

    const onValueChangeB = vi.fn();
    const readonly = await render(<Input aria-label="R" readOnly onValueChange={onValueChangeB} />);
    await user.type(inputOf(readonly.container), 'x');
    expect(inputOf(readonly.container).value).toBe('');
    expect(onValueChangeB).not.toHaveBeenCalled();
  });

  it('is a drop-in <input>: passes through props and composes the consumer onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = await render(
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
