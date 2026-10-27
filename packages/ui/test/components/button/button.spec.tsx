/**
 * Browser-project performance of the Button score for the React target: real
 * chromium through @vitest/browser-playwright, proving parts + aria for every
 * scenario, the toggle keymap, and the loading/soft-disabled/hard-disabled
 * edges React composes on top of the shared score.
 */
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, test } from 'vitest';
import { page } from 'vitest/browser';
import { Button, type ButtonProps } from '../../../src/components/button/button';
import {
  button,
  type ButtonConfig,
  type ButtonPart,
} from '../../../src/components/button/button.behavior';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
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
  expectedParts: ReadonlyArray<ButtonPart>;
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
  return { root };
}

/** Every declared part present, and the rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(
  root: HTMLElement,
  state: ReturnType<typeof button.initialState>,
  config: ButtonConfig,
  expectedParts: ReadonlyArray<ButtonPart>,
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
    startIcon: root.querySelector<HTMLElement>('[data-part="startIcon"]')?.id ?? '',
    endIcon: root.querySelector<HTMLElement>('[data-part="endIcon"]')?.id ?? '',
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
      const { root } = renderButton(scenario.props, 'Save changes');
      const config = configFor(scenario.props);
      const state = button.initialState(config);
      assertContract(root, state, config, scenario.expectedParts);
    });
  }

  it('toggle: Enter and Space flip aria-pressed through the keymap', async () => {
    const { root } = renderButton({ toggle: true }, 'Mute');
    expect(root.getAttribute('aria-pressed')).toBe('false');
    const user = userEvent.setup();
    root.focus();
    await user.keyboard('{Enter}');
    expect(root.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard(' ');
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('loading at mount: aria-busy projected, announce suppressed (edge, not level)', () => {
    // A button whose markup renders already-loading is baseline for the
    // one-shot announce effect: aria-busy is projected but NO live-region
    // announcement fires. The runtime loading transition (false->true) is
    // the retained-mode surface, proven below.
    expect(getAnnouncerCount()).toBe(0);
    const { root } = renderButton({ loading: true }, 'Saving');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(getAnnouncerCount()).toBe(0);
  });

  it('loading: activation is suppressed, focus is kept, label survives', async () => {
    const { root } = renderButton({ toggle: true, loading: true }, 'Submit');
    expect(root.hasAttribute('disabled')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('[data-part="label"]')?.textContent).toContain('Submit');
    const user = userEvent.setup();
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('soft-disabled: discoverable, focusable, suppressed', async () => {
    const { root } = renderButton({ toggle: true, softDisabled: true }, 'Archive');
    expect(root.hasAttribute('disabled')).toBe(false);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    const user = userEvent.setup();
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('hard disabled: native disabled only, no redundant aria-disabled', () => {
    const { root } = renderButton({ disabled: true }, 'Delete');
    expect(root.hasAttribute('disabled')).toBe(true);
    expect(root.hasAttribute('aria-disabled')).toBe(false);
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

describe('button icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;

  it('start, end and both render beside the label on one line', () => {
    for (const [name, node] of [
      [
        'start',
        <Button key="start" startIcon={svg(ICON_SVG_16)}>
          Send
        </Button>,
      ],
      [
        'end',
        <Button key="end" endIcon={svg(ICON_SVG_16)}>
          Send
        </Button>,
      ],
      [
        'both',
        <Button key="both" startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
          Send
        </Button>,
      ],
    ] as const) {
      const { container, unmount } = render(node);
      const root = container.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
      const r = rectsOf(root);
      if (name !== 'end') {
        expect(r.start, name).not.toBeNull();
        expect(r.start?.right as number).toBeLessThanOrEqual(r.label.left + 0.5);
        expect(Math.abs((r.start?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      if (name !== 'start') {
        expect(r.end, name).not.toBeNull();
        expect(r.end?.left as number).toBeGreaterThanOrEqual(r.label.right - 0.5);
        expect(Math.abs((r.end?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      unmount();
    }
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const { container } = render(<Button startIcon={svg(ICON_SVG_16)}>Send</Button>);
    const r = rectsOf(container.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement);
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', () => {
    const { container } = render(
      <Button startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_20)}>
        Send
      </Button>,
    );
    const r = rectsOf(container.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement);
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('each wrapper is aria-hidden and absent when no icon is given', () => {
    const { container } = render(
      <Button startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
        Send
      </Button>,
    );
    for (const part of ['startIcon', 'endIcon']) {
      const wrapper = container.querySelector(`[data-part="${part}"]`);
      expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(container.querySelector('[data-part="startIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-start',
    );
    expect(container.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-end',
    );
    cleanup();
    const bare = render(<Button>Send</Button>);
    expect(bare.container.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(bare.container.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the accessible name is the label alone even when the svg has a title', async () => {
    render(
      <Button
        startIcon={
          <svg viewBox="0 0 24 24" width="16" height="16">
            <title>Mail icon</title>
          </svg>
        }
      >
        Send
      </Button>,
    );
    await expect
      .element(page.getByRole('button', { name: 'Send', exact: true }))
      .toBeInTheDocument();
  });

  it('the spinner and an icon coexist without moving the label', () => {
    const idle = render(<Button startIcon={svg(ICON_SVG_16)}>Send</Button>);
    const before = rectsOf(idle.container.querySelector('[data-part="root"]') as HTMLElement);
    idle.unmount();
    const busy = render(
      <Button loading startIcon={svg(ICON_SVG_16)}>
        Send
      </Button>,
    );
    const root = busy.container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.querySelector('[data-part="spinner"]')).not.toBeNull();
    expect(root.querySelector('[data-part="startIcon"]')).not.toBeNull();
    expect(rectsOf(root).label.width).toBe(before.label.width);
  });
});

describe('surface precedence (FR-RAF-FILL-004)', () => {
  const classOf = (props: ButtonProps): string[] => {
    const { container } = render(<Button {...props}>Go</Button>);
    return (container.querySelector('button')?.className ?? '').split(/\s+/);
  };

  it('surface replaces the base surface when no variant is given', () => {
    const classes = classOf({ surface: 'card' });
    expect(classes).toContain('bg-surface-card');
    expect(classes).not.toContain('bg-primary');
  });

  it('an explicit variant, default included, beats surface', () => {
    for (const variant of ['default', 'destructive'] as const) {
      const classes = classOf({ surface: 'card', variant });
      expect(classes).not.toContain('bg-surface-card');
      cleanup();
    }
  });

  it('a fill beats surface', () => {
    const classes = classOf({ surface: 'card', fill: 'bg-fill-glass' });
    expect(classes).toContain('bg-fill-glass');
    expect(classes).not.toContain('bg-surface-card');
  });
});
