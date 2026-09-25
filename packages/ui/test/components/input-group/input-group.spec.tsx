/**
 * Browser-project performance of the input-group score, driven end to end.
 * The oracle's three-export surface (InputGroup / InputGroupAddon /
 * InputGroupInput) is a drop-in: same component names, same prop names, same
 * composition order.
 */
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../../src/components/input-group/input-group';
import {
  type InputGroupConfig,
  type InputGroupPart,
  type InputGroupState,
  inputGroupBehavior,
} from '../../../src/components/input-group/input-group.behavior';

afterEach(async () => {
  await cleanup();
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

const rootOf = (host: HTMLElement) => partElement(host, 'root') as HTMLElement;
const controlOf = (host: HTMLElement) => partElement(host, 'control') as HTMLInputElement;

/**
 * Assert the aria/data-state projection for the given parts against the
 * score's own `aria()` function, reading each part's id from the real DOM --
 * the fidelity check every spec makes: the bound DOM must equal
 * what the score projects for the same config.
 */
function assertAriaContract(
  root: HTMLElement,
  state: InputGroupState,
  config: InputGroupConfig,
  expectedParts: ReadonlyArray<InputGroupPart>,
): void {
  for (const part of expectedParts) {
    expect(partElement(root, part), `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const allParts = Object.keys(inputGroupBehavior.parts) as InputGroupPart[];
  const ids = {} as Record<InputGroupPart, string>;
  for (const part of allParts) {
    ids[part] = partElement(root, part)?.id ?? '';
  }
  const projection = inputGroupBehavior.aria(state, config, ids);
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

describe('input-group [react]', () => {
  it('valid group with both affixes fulfils the contract', async () => {
    const { container } = await render(
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon position="end">USD</InputGroupAddon>
      </InputGroup>,
    );
    assertAriaContract(rootOf(container), {}, { invalid: false }, [
      'root',
      'control',
      'addonStart',
      'addonEnd',
    ]);
    expect(controlOf(container).hasAttribute('aria-invalid')).toBe(false);
    expect(rootOf(container).getAttribute('data-state')).toBe('default');
  });

  it('invalid: aria-invalid lands on the control, data-state on both', async () => {
    const { container } = await render(
      <InputGroup invalid>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
      </InputGroup>,
    );
    assertAriaContract(rootOf(container), {}, { invalid: true }, ['root', 'control', 'addonStart']);
    expect(controlOf(container).getAttribute('aria-invalid')).toBe('true');
    expect(controlOf(container).getAttribute('data-state')).toBe('invalid');
    expect(rootOf(container).getAttribute('data-state')).toBe('invalid');
    expect(rootOf(container).hasAttribute('aria-invalid')).toBe(false);
  });

  it('a group with no affixes renders neither optional part', async () => {
    const { container } = await render(
      <InputGroup>
        <InputGroupInput aria-label="Bare" />
      </InputGroup>,
    );
    assertAriaContract(rootOf(container), {}, { invalid: false }, ['root', 'control']);
    expect(partElement(rootOf(container), 'addonStart')).toBeNull();
    expect(partElement(rootOf(container), 'addonEnd')).toBeNull();
  });

  it('affixes project the side they sit on', async () => {
    const { container } = await render(
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon position="end">USD</InputGroupAddon>
      </InputGroup>,
    );
    const root = rootOf(container);
    expect(partElement(root, 'addonStart')?.getAttribute('data-position')).toBe('start');
    expect(partElement(root, 'addonEnd')?.getAttribute('data-position')).toBe('end');
  });

  it('the contained control keeps its own value: typing works, the group holds nothing', async () => {
    const user = userEvent.setup();
    const { container } = await render(
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" defaultValue="" />
      </InputGroup>,
    );
    const control = controlOf(container);
    await user.type(control, '42');
    expect(control.value).toBe('42');
  });

  it('a disabled group disables the control it contains', async () => {
    const { container } = await render(
      <InputGroup disabled>
        <InputGroupInput aria-label="Amount" />
      </InputGroup>,
    );
    expect(controlOf(container).disabled).toBe(true);
    expect(rootOf(container).hasAttribute('data-disabled')).toBe(true);
  });

  it('an enabled group never re-enables an individually disabled control', async () => {
    const { container } = await render(
      <InputGroup>
        <InputGroupInput aria-label="Amount" disabled />
      </InputGroup>,
    );
    expect(controlOf(container).disabled).toBe(true);
  });

  it('is a drop-in: passes native input props through to the control', async () => {
    const user = userEvent.setup();
    const { container } = await render(
      <InputGroup size="lg">
        <InputGroupInput aria-label="Email" type="email" name="email" placeholder="you@x.com" />
      </InputGroup>,
    );
    const control = controlOf(container);
    expect(control.type).toBe('email');
    expect(control.name).toBe('email');
    expect(control.placeholder).toBe('you@x.com');
    expect(rootOf(container).getAttribute('data-size')).toBe('lg');
    await user.type(control, 'a');
    expect(control.value).toBe('a');
  });

  it('an affix action button stays reachable and clickable in an enabled group', async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    const { container } = await render(
      <InputGroup>
        <InputGroupInput aria-label="Code" />
        <InputGroupAddon position="end">
          <button type="button" onClick={() => clicks.push('apply')}>
            Apply
          </button>
        </InputGroupAddon>
      </InputGroup>,
    );
    await user.click(container.querySelector('button') as HTMLButtonElement);
    expect(clicks).toEqual(['apply']);
  });
});
