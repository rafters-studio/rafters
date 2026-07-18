/**
 * React render adapter + the shared checkbox conformance suite, plus the
 * form-association and controlled-checkbox surfaces that are React-specific.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox, type CheckboxProps } from '../../../src/components/checkbox/checkbox';
import type { RenderResult } from '../../harness/conformance';
import {
  runCheckboxConformance,
  type CheckboxAdapter,
  type CheckboxScenarioProps,
} from './conformance-suite';

function toProps(props: CheckboxScenarioProps, label: string): CheckboxProps {
  // Scenario `checked` seeds the UNCONTROLLED axis so the interaction tests can
  // toggle it; the controlled prop is exercised separately below.
  return {
    defaultChecked: props.checked,
    disabled: props.disabled,
    required: props.required,
    variant: props.variant,
    size: props.size,
    'aria-label': label,
  } as CheckboxProps;
}

const reactAdapter: CheckboxAdapter = {
  name: 'react',
  render(props, label): RenderResult {
    const utils = render(<Checkbox {...toProps(props, label)} />);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runCheckboxConformance(reactAdapter);

afterEach(() => {
  cleanup();
});

describe('checkbox [react] controlled', () => {
  it('controlled: the box does not move on its own; onCheckedChange reports the next value', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { rerender, container } = render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="Terms" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]')!;
    expect(root.getAttribute('aria-checked')).toBe('false');

    await user.click(root);
    // Controlled: effective value did not move, but the callback reports the pick.
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(root.getAttribute('aria-checked')).toBe('false');

    rerender(<Checkbox checked onCheckedChange={onCheckedChange} aria-label="Terms" />);
    expect(root.getAttribute('aria-checked')).toBe('true');
  });

  it('controlled indeterminate: click reports true (mixed -> checked)', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { container } = render(
      <Checkbox checked="indeterminate" onCheckedChange={onCheckedChange} aria-label="All" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]')!;
    expect(root.getAttribute('aria-checked')).toBe('mixed');
    await user.click(root);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });
});

describe('checkbox [react] form association', () => {
  it('a named box submits its value only while checked (FormData contract)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Checkbox name="terms" aria-label="Accept terms" />
      </form>,
    );
    const form = container.querySelector('form')!;
    const root = container.querySelector<HTMLElement>('[data-part="root"]')!;

    // Unchecked: the mirrored input is disabled, so the field submits nothing.
    expect(new FormData(form).get('terms')).toBeNull();

    await user.click(root);
    expect(new FormData(form).get('terms')).toBe('on');

    await user.click(root);
    expect(new FormData(form).get('terms')).toBeNull();
  });

  it('a custom value is what submits when checked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Checkbox name="plan" value="pro" aria-label="Pro plan" />
      </form>,
    );
    const form = container.querySelector('form')!;
    await user.click(container.querySelector<HTMLElement>('[data-part="root"]')!);
    expect(new FormData(form).get('plan')).toBe('pro');
  });

  it('an indeterminate box submits nothing', () => {
    const { container } = render(
      <form>
        <Checkbox name="all" checked="indeterminate" aria-label="Select all" />
      </form>,
    );
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('all')).toBeNull();
  });

  it('an unnamed box renders no hidden input', () => {
    const { container } = render(<Checkbox aria-label="Nameless" />);
    expect(container.querySelector('input[data-part="hidden-input"]')).toBeNull();
  });
});
