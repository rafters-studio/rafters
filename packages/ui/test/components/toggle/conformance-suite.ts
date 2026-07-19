/**
 * Toggle conformance suite -- one suite, run per render adapter.
 * The React, WC, and Astro conformance tests are each their adapter plus a
 * call into runToggleConformance. One score, three performances.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  type RenderResult,
} from '../../harness/conformance';

export interface ToggleScenarioProps {
  variant?: ToggleConfig['variant'];
  size?: ToggleConfig['size'];
  disabled?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

export interface ToggleAdapter {
  name: string;
  render(props: ToggleScenarioProps, label: string): RenderResult | Promise<RenderResult>;
  /** The icon-only accessible-name pattern is binding-specific; adapters that
   *  cannot express it opt out. */
  supportsIconLabel: boolean;
}

interface Scenario {
  name: string;
  props: ToggleScenarioProps;
  iconLabel?: boolean;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'off default', props: {} },
  { name: 'on (pressed)', props: { pressed: true } },
  { name: 'outline variant', props: { variant: 'outline' } },
  { name: 'large size on', props: { size: 'lg', pressed: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'icon-only with accessible name', props: { ariaLabel: 'Bold' }, iconLabel: true },
];

const EXPECTED_PARTS = ['root', 'label'] as const;

function configFor(props: ToggleScenarioProps): ToggleConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: true,
    disabled: props.disabled ?? false,
    defaultPressed: props.pressed ?? false,
  };
}

export function runToggleConformance(adapter: ToggleAdapter): void {
  describe(`toggle conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      if (scenario.iconLabel && !adapter.supportsIconLabel) continue;

      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Bold');
        try {
          const config = configFor(scenario.props);
          const state = toggle.initialState(config);
          assertContractFulfillment(toggle, result.root, state, config, EXPECTED_PARTS);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Bold');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('Enter and Space flip aria-pressed and data-state through the keymap', async () => {
      const result = await adapter.render({}, 'Bold');
      try {
        const root = result.root;
        expect(root.getAttribute('aria-pressed')).toBe('false');
        expect(root.getAttribute('data-state')).toBe('off');
        const user = userEvent.setup();
        root.focus();
        await user.keyboard('{Enter}');
        expect(partElement(root, 'root')?.getAttribute('aria-pressed')).toBe('true');
        expect(partElement(root, 'root')?.getAttribute('data-state')).toBe('on');
        await user.keyboard(' ');
        expect(partElement(root, 'root')?.getAttribute('aria-pressed')).toBe('false');
        expect(partElement(root, 'root')?.getAttribute('data-state')).toBe('off');
      } finally {
        result.cleanup();
      }
    });

    it('hard disabled: native disabled only, no aria-disabled, press suppressed', async () => {
      const result = await adapter.render({ disabled: true }, 'Bold');
      try {
        const root = result.root;
        expect(root.hasAttribute('disabled')).toBe(true);
        expect(root.hasAttribute('aria-disabled')).toBe(false);
        const user = userEvent.setup();
        await user.click(root);
        expect(root.getAttribute('aria-pressed')).toBe('false');
      } finally {
        result.cleanup();
      }
    });
  });
}
