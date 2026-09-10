/**
 * React performance of the switch score, driven end to end, plus the
 * retained-mode-only controlled-callback proof (gotcha #1).
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch, type SwitchProps } from '../../../src/components/switch/switch';
import { switchBehavior, type SwitchConfig } from '../../../src/components/switch/switch.behavior';

interface ScenarioProps {
  variant?: SwitchConfig['variant'];
  size?: SwitchConfig['size'];
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked default', props: {} },
  { name: 'checked', props: { checked: true } },
  { name: 'destructive lg checked', props: { variant: 'destructive', size: 'lg', checked: true } },
  { name: 'small', props: { size: 'sm' } },
  { name: 'required unchecked', props: { required: true } },
  { name: 'disabled', props: { disabled: true } },
];

const EXPECTED_PARTS = ['root', 'thumb'] as const;

function configFor(props: ScenarioProps): SwitchConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
  };
}

function toProps(props: ScenarioProps, label: string): SwitchProps {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    defaultChecked: props.checked,
    disabled: props.disabled,
    required: props.required,
    'aria-label': label,
  };
  return mapped as unknown as SwitchProps;
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function renderSwitch(props: ScenarioProps, label: string) {
  const utils = render(<Switch {...toProps(props, label)} />);
  const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no [data-part="root"] rendered');
  return { root, unmount: utils.unmount };
}

describe('switch conformance [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      const { root, unmount } = renderSwitch(scenario.props, 'Enable notifications');
      try {
        const config = configFor(scenario.props);
        const state = switchBehavior.initialState(config);
        const ids = { root: root.id, thumb: partElement(root, 'thumb')?.id ?? '' };
        const projection = switchBehavior.aria(state, config, ids);
        for (const part of EXPECTED_PARTS) {
          const element = partElement(root, part);
          expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
          const decl = switchBehavior.parts[part];
          if (decl.role) {
            expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
          }
          const attrs = projection[part];
          if (!attrs || !element) continue;
          for (const [attr, value] of Object.entries(attrs)) {
            if (value === undefined) {
              expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(
                false,
              );
            } else {
              expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
            }
          }
        }
      } finally {
        unmount();
      }
    });
  }

  it('click toggles aria-checked and the data-state on root and thumb', async () => {
    const { root, unmount } = renderSwitch({}, 'Wi-Fi');
    try {
      const thumb = partElement(root, 'thumb');
      expect(root.getAttribute('aria-checked')).toBe('false');
      expect(root.getAttribute('data-state')).toBe('unchecked');
      expect(thumb?.getAttribute('data-state')).toBe('unchecked');

      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
      expect(root.getAttribute('data-state')).toBe('checked');
      expect(thumb?.getAttribute('data-state')).toBe('checked');

      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('false');
      expect(thumb?.getAttribute('data-state')).toBe('unchecked');
    } finally {
      unmount();
    }
  });

  it('Space and Enter flip aria-checked (native activation)', async () => {
    const { root, unmount } = renderSwitch({}, 'Bluetooth');
    try {
      expect(root.getAttribute('aria-checked')).toBe('false');
      const user = userEvent.setup();
      root.focus();
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('true');
      await user.keyboard('{Enter}');
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('disabled: native disabled only, no aria-disabled, click does not toggle', async () => {
    const { root, unmount } = renderSwitch({ disabled: true }, 'Airplane mode');
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

describe('switch controlled callback [react]', () => {
  it('a controlled switch never moves its own aria-checked but reports every change', async () => {
    const changes: boolean[] = [];
    const { container } = render(
      <Switch checked={false} onCheckedChange={(next) => changes.push(next)} aria-label="Sync" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('no root');
    const user = userEvent.setup();

    await user.click(root);
    // Effective value is pinned by the controlled prop -> stays false...
    expect(root.getAttribute('aria-checked')).toBe('false');
    // ...but the callback reports the value the consumer should adopt.
    expect(changes).toEqual([true]);

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(changes).toEqual([true, true]);
  });

  it('an uncontrolled switch fires onCheckedChange with the intrinsic-after value', async () => {
    const changes: boolean[] = [];
    const { container } = render(
      <Switch onCheckedChange={(next) => changes.push(next)} aria-label="Save drafts" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('no root');
    const user = userEvent.setup();

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(changes).toEqual([true]);

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(changes).toEqual([true, false]);
  });
});
