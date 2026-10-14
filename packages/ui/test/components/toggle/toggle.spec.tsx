/**
 * React performance of the toggle score, driven end to end. Toggle composes
 * `pressable` in toggle mode (Spec 01), so `aria-pressed` always projects and
 * the pressed axis rides `data-[state=on|off]`.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { Toggle, type ToggleProps } from '../../../src/components/toggle/toggle';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from '../button/icon-layout';

interface Scenario {
  name: string;
  props: Partial<ToggleProps>;
}

/** The scenarios the score's aria projection must hold across: every axis
 *  (variant, size, disabled, pressed) and the icon-only accessible-name
 *  pattern React alone can express via aria-label passthrough. */
const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'off default', props: {} },
  { name: 'on (pressed)', props: { defaultPressed: true } },
  { name: 'outline variant', props: { variant: 'outline' } },
  { name: 'large size on', props: { size: 'lg', defaultPressed: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'icon-only with accessible name', props: { 'aria-label': 'Bold' } },
];

function configFor(props: Partial<ToggleProps>): ToggleConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: true,
    disabled: props.disabled ?? false,
    defaultPressed: props.defaultPressed ?? false,
  };
}

function root(): HTMLElement {
  const element = document.body.querySelector<HTMLElement>('[data-part="root"]');
  if (!element) throw new Error('no [data-part="root"] rendered');
  return element;
}

afterEach(() => {
  cleanup();
});

describe('toggle [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      render(<Toggle {...scenario.props}>Bold</Toggle>);
      const config = configFor(scenario.props);
      const state = toggle.initialState(config);
      const rootEl = root();
      const label = rootEl.querySelector<HTMLElement>('[data-part="label"]');

      // structure: both declared parts are rendered.
      expect(label, 'declared part "label" must be rendered').not.toBeNull();

      // aria: the rendered DOM equals the score's projection, including
      // absence -- a projected undefined means the attribute is not rendered.
      const ids = {
        root: rootEl.id,
        label: label?.id ?? '',
        startIcon: '',
        endIcon: '',
      };
      const projection = toggle.aria(state, config, ids);
      // Only root/label: `spinner` is pressable's optional part (parts.ts:27,
      // 'spinner': { optional: true }) and Toggle's React/WC/Astro decorators
      // never render a data-part="spinner" element (confirmed by inspection --
      // no lane emits one), so its unconditional aria-hidden projection has no
      // DOM node to land on. Asserting it here would be a false failure, not a
      // dropped check: the former harness's EXPECTED_PARTS made the
      // same exclusion.
      for (const part of ['root', 'label'] as const) {
        const attrs = projection[part];
        if (!attrs) continue;
        const el = part === 'root' ? rootEl : label;
        for (const [attr, value] of Object.entries(attrs)) {
          if (value === undefined) {
            expect(el?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
          } else {
            expect(el?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
          }
        }
      }
    });
  }

  it('Enter and Space flip aria-pressed and data-state through the keymap', async () => {
    render(<Toggle>Bold</Toggle>);
    const rootEl = root();
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
    expect(rootEl.getAttribute('data-state')).toBe('off');
    const user = userEvent.setup();
    rootEl.focus();
    await user.keyboard('{Enter}');
    expect(rootEl.getAttribute('aria-pressed')).toBe('true');
    expect(rootEl.getAttribute('data-state')).toBe('on');
    await user.keyboard(' ');
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
    expect(rootEl.getAttribute('data-state')).toBe('off');
  });

  it('hard disabled: native disabled only, no aria-disabled, press suppressed', async () => {
    render(<Toggle disabled>Bold</Toggle>);
    const rootEl = root();
    expect(rootEl.hasAttribute('disabled')).toBe(true);
    expect(rootEl.hasAttribute('aria-disabled')).toBe(false);
    const user = userEvent.setup();
    await user.click(rootEl);
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('toggle icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;

  it('start, end and both render beside the label on one line', () => {
    for (const [name, node] of [
      ['start', <Toggle startIcon={svg(ICON_SVG_16)}>Bold</Toggle>],
      ['end', <Toggle endIcon={svg(ICON_SVG_16)}>Bold</Toggle>],
      [
        'both',
        <Toggle startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
          Bold
        </Toggle>,
      ],
    ] as const) {
      const { unmount } = render(node);
      const r = rectsOf(root());
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
    render(<Toggle startIcon={svg(ICON_SVG_16)}>Bold</Toggle>);
    const r = rectsOf(root());
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', () => {
    render(
      <Toggle startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_20)}>
        Bold
      </Toggle>,
    );
    const r = rectsOf(root());
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('each wrapper is aria-hidden and absent when no icon is given', () => {
    const { container } = render(
      <Toggle startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
        Bold
      </Toggle>,
    );
    for (const part of ['startIcon', 'endIcon']) {
      expect(container.querySelector(`[data-part="${part}"]`)?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
    expect(container.querySelector('[data-part="startIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-start',
    );
    expect(container.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-end',
    );
    cleanup();
    const bare = render(<Toggle>Bold</Toggle>);
    expect(bare.container.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(bare.container.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the accessible name is the label alone even when the svg has a title', async () => {
    render(
      <Toggle
        startIcon={
          <svg viewBox="0 0 24 24" width="16" height="16">
            <title>Bold icon</title>
          </svg>
        }
      >
        Bold
      </Toggle>,
    );
    await expect
      .element(page.getByRole('button', { name: 'Bold', exact: true }))
      .toBeInTheDocument();
  });
});
