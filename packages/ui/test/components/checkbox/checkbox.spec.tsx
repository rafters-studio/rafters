/**
 * React performance of the checkbox score, driven end to end, plus the
 * form-association and controlled-checkbox surfaces that are React-specific.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox, type CheckboxProps } from '../../../src/components/checkbox/checkbox';
import { checkbox, type CheckboxConfig } from '../../../src/components/checkbox/checkbox.behavior';

interface ScenarioProps {
  checked?: CheckboxConfig['checked'];
  disabled?: boolean;
  required?: boolean;
  variant?: CheckboxConfig['variant'];
  size?: CheckboxConfig['size'];
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked default', props: {} },
  { name: 'checked', props: { checked: true } },
  { name: 'indeterminate', props: { checked: 'indeterminate' } },
  { name: 'required', props: { required: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'destructive lg checked', props: { checked: true, variant: 'destructive', size: 'lg' } },
];

function configFor(props: ScenarioProps): CheckboxConfig {
  return {
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
  };
}

function toProps(props: ScenarioProps, label: string): CheckboxProps {
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

function renderCheckbox(props: ScenarioProps, label: string) {
  const utils = render(<Checkbox {...toProps(props, label)} />);
  const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no [data-part="root"] rendered');
  return { root, unmount: utils.unmount };
}

afterEach(() => {
  cleanup();
});

describe('checkbox [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      const { root, unmount } = renderCheckbox(scenario.props, 'Accept terms');
      try {
        const config = configFor(scenario.props);
        const state = checkbox.initialState(config);
        // Only declared part is `root` -- no role check (checkbox.parts.root has
        // no declared role) -- so the aria sweep is the whole contract.
        const projection = checkbox.aria(state, config, { root: root.id })['root'];
        for (const [attr, value] of Object.entries(projection ?? {})) {
          if (value === undefined) {
            expect(root.hasAttribute(attr), `root must NOT render ${attr}`).toBe(false);
          } else {
            expect(root.getAttribute(attr), `root ${attr}`).toBe(String(value));
          }
        }
      } finally {
        unmount();
      }
    });
  }

  it('Space toggles aria-checked false -> true -> false (native button key path)', async () => {
    const { root, unmount } = renderCheckbox({}, 'Subscribe');
    try {
      expect(root.getAttribute('aria-checked')).toBe('false');
      const user = userEvent.setup();
      root.focus();
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('true');
      expect(root.getAttribute('data-state')).toBe('checked');
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('click toggles the checked axis', async () => {
    const { root, unmount } = renderCheckbox({}, 'Subscribe');
    try {
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
    } finally {
      unmount();
    }
  });

  it('indeterminate toggles to checked (mixed -> true), never back to mixed', async () => {
    const { root, unmount } = renderCheckbox({ checked: 'indeterminate' }, 'Select all');
    try {
      expect(root.getAttribute('aria-checked')).toBe('mixed');
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
    } finally {
      unmount();
    }
  });

  it('hard disabled: native disabled, no aria-disabled, click does not toggle', async () => {
    const { root, unmount } = renderCheckbox({ disabled: true }, 'Locked');
    try {
      expect(root.hasAttribute('disabled')).toBe(true);
      expect(root.hasAttribute('aria-disabled')).toBe(false);
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      unmount();
    }
  });
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
