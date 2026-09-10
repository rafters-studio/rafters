/**
 * Browser-project performance of the Button score for the React target: real
 * chromium through @vitest/browser-playwright, proving parts + aria for every
 * scenario, the toggle keymap, and the loading/soft-disabled/hard-disabled
 * edges React composes on top of the shared score.
 */
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, test } from 'vitest';
import { page } from 'vitest/browser';
import { Button, type ButtonProps } from '../../../src/components/button/button';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { clearAllAnnouncers, getAnnouncerCount } from '../../../src/primitives/sr-announcer';

afterEach(() => {
  cleanup();
  clearAllAnnouncers();
});

test('renders in a real browser', async () => {
  render(<Button id="b1">Go</Button>);
  await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
});

interface ScenarioProps {
  variant?: ButtonConfig['variant'];
  size?: ButtonConfig['size'];
  disabled?: boolean;
  softDisabled?: boolean;
  loading?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
  expectedParts: ReadonlyArray<'root' | 'label' | 'spinner'>;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'idle default', props: {}, expectedParts: ['root', 'label'] },
  {
    name: 'destructive lg',
    props: { variant: 'destructive', size: 'lg' },
    expectedParts: ['root', 'label'],
  },
  { name: 'loading', props: { loading: true }, expectedParts: ['root', 'label', 'spinner'] },
  { name: 'toggle unpressed', props: { toggle: true }, expectedParts: ['root', 'label'] },
  {
    name: 'toggle pressed',
    props: { toggle: true, pressed: true },
    expectedParts: ['root', 'label'],
  },
  { name: 'soft-disabled', props: { softDisabled: true }, expectedParts: ['root', 'label'] },
  { name: 'hard disabled', props: { disabled: true }, expectedParts: ['root', 'label'] },
  {
    name: 'icon-only with accessible name',
    props: { size: 'icon', ariaLabel: 'Close' },
    expectedParts: ['root', 'label'],
  },
];

function configFor(props: ScenarioProps): ButtonConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: props.toggle ?? false,
    disabled: props.disabled ?? false,
    softDisabled: props.softDisabled ?? false,
    loading: props.loading ?? false,
    defaultPressed: props.pressed ?? false,
  };
}

function toProps(props: ScenarioProps): ButtonProps {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    softDisabled: props.softDisabled,
    loading: props.loading,
    toggle: props.toggle,
    defaultPressed: props.pressed,
  };
  if (props.ariaLabel !== undefined) mapped['aria-label'] = props.ariaLabel;
  return mapped as unknown as ButtonProps;
}

function renderButton(props: ScenarioProps, label: string) {
  const utils = render(<Button {...toProps(props)}>{label}</Button>);
  const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no [data-part="root"] rendered');
  return { root, unmount: utils.unmount };
}

/** Every declared part present, and the rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(
  root: HTMLElement,
  state: ReturnType<typeof button.initialState>,
  config: ButtonConfig,
  expectedParts: ReadonlyArray<'root' | 'label' | 'spinner'>,
): void {
  for (const part of expectedParts) {
    const element =
      part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const ids = {
    root: root.id,
    label: root.querySelector<HTMLElement>('[data-part="label"]')?.id ?? '',
    spinner: root.querySelector<HTMLElement>('[data-part="spinner"]')?.id ?? '',
  };
  const projection = button.aria(state, config, ids);
  for (const part of Object.keys(button.parts) as Array<keyof typeof projection>) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element =
      part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
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

describe('button [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      const { root, unmount } = renderButton(scenario.props, 'Save changes');
      try {
        const config = configFor(scenario.props);
        const state = button.initialState(config);
        assertContract(root, state, config, scenario.expectedParts);
      } finally {
        unmount();
      }
    });
  }

  it('toggle: Enter and Space flip aria-pressed through the keymap', async () => {
    const { root, unmount } = renderButton({ toggle: true }, 'Mute');
    try {
      expect(root.getAttribute('aria-pressed')).toBe('false');
      const user = userEvent.setup();
      root.focus();
      await user.keyboard('{Enter}');
      expect(root.getAttribute('aria-pressed')).toBe('true');
      await user.keyboard(' ');
      expect(root.getAttribute('aria-pressed')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('loading at mount: aria-busy projected, announce suppressed (edge, not level)', () => {
    // A button whose markup renders already-loading is baseline for the
    // one-shot announce effect: aria-busy is projected but NO live-region
    // announcement fires. The runtime loading transition (false->true) is
    // the retained-mode surface, proven below.
    expect(getAnnouncerCount()).toBe(0);
    const { root, unmount } = renderButton({ loading: true }, 'Saving');
    try {
      expect(root.getAttribute('aria-busy')).toBe('true');
      expect(getAnnouncerCount()).toBe(0);
    } finally {
      unmount();
    }
  });

  it('loading: activation is suppressed, focus is kept, label survives', async () => {
    const { root, unmount } = renderButton({ toggle: true, loading: true }, 'Submit');
    try {
      expect(root.hasAttribute('disabled')).toBe(false);
      expect(root.getAttribute('aria-busy')).toBe('true');
      expect(root.querySelector('[data-part="label"]')?.textContent).toContain('Submit');
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-pressed')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('soft-disabled: discoverable, focusable, suppressed', async () => {
    const { root, unmount } = renderButton({ toggle: true, softDisabled: true }, 'Archive');
    try {
      expect(root.hasAttribute('disabled')).toBe(false);
      expect(root.getAttribute('aria-disabled')).toBe('true');
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-pressed')).toBe('false');
    } finally {
      unmount();
    }
  });

  it('hard disabled: native disabled only, no redundant aria-disabled', () => {
    const { root, unmount } = renderButton({ disabled: true }, 'Delete');
    try {
      expect(root.hasAttribute('disabled')).toBe(true);
      expect(root.hasAttribute('aria-disabled')).toBe(false);
    } finally {
      unmount();
    }
  });
});

/**
 * The loading announcement is edge-triggered: it fires on a loading TRANSITION,
 * not on a mount that is already loading. The Button composes the sr-announcer
 * primitive directly in a React effect that compares the previous loading flag
 * against the current one, so it announces only when loading crosses
 * false->true and stays silent on a baseline mount.
 */
describe('button announce [react, edge-triggered]', () => {
  it('does NOT announce when it mounts already loading (baseline)', async () => {
    expect(getAnnouncerCount()).toBe(0);
    const { unmount } = render(<Button loading>Saving</Button>);
    // Give effects a tick to settle; a baseline loading state must stay silent.
    await Promise.resolve();
    expect(getAnnouncerCount()).toBe(0);
    unmount();
  });

  it('announces when loading transitions false -> true', async () => {
    expect(getAnnouncerCount()).toBe(0);
    const { rerender, unmount } = render(
      <Button loadingAnnouncement="Saving changes">Save</Button>,
    );
    expect(getAnnouncerCount()).toBe(0);
    rerender(
      <Button loading loadingAnnouncement="Saving changes">
        Save
      </Button>,
    );
    await waitFor(() => {
      const region = document.querySelector('[data-sr-announcer]');
      expect(region?.textContent).toBe('Saving changes');
    });
    expect(getAnnouncerCount()).toBe(1);
    unmount();
  });
});
