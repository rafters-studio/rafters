/**
 * Switch conformance suite -- one suite, run per render adapter.
 * The React and WC conformance tests are each their adapter plus a call into
 * runSwitchConformance. Astro drives the same score from its own file.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { switchBehavior, type SwitchConfig } from '../../../src/components/switch/switch.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  type RenderResult,
} from '../../harness/conformance';

export interface SwitchScenarioProps {
  variant?: SwitchConfig['variant'];
  size?: SwitchConfig['size'];
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export interface SwitchAdapter {
  name: string;
  /** Every scenario carries an accessible name: a switch has no intrinsic text,
   *  so the adapter always applies `label` as the control's accessible name. */
  render(props: SwitchScenarioProps, label: string): RenderResult | Promise<RenderResult>;
}

interface Scenario {
  name: string;
  props: SwitchScenarioProps;
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

function configFor(props: SwitchScenarioProps): SwitchConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
  };
}

export function runSwitchConformance(adapter: SwitchAdapter): void {
  describe(`switch conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Enable notifications');
        try {
          const config = configFor(scenario.props);
          const state = switchBehavior.initialState(config);
          assertContractFulfillment(switchBehavior, result.root, state, config, EXPECTED_PARTS);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Enable notifications');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('click toggles aria-checked and the data-state on root and thumb', async () => {
      const result = await adapter.render({}, 'Wi-Fi');
      try {
        const root = result.root;
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
        result.cleanup();
      }
    });

    it('Space and Enter flip aria-checked (native activation)', async () => {
      const result = await adapter.render({}, 'Bluetooth');
      try {
        const root = result.root;
        expect(root.getAttribute('aria-checked')).toBe('false');
        const user = userEvent.setup();
        root.focus();
        await user.keyboard(' ');
        expect(root.getAttribute('aria-checked')).toBe('true');
        await user.keyboard('{Enter}');
        expect(root.getAttribute('aria-checked')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('disabled: native disabled only, no aria-disabled, click does not toggle', async () => {
      const result = await adapter.render({ disabled: true }, 'Airplane mode');
      try {
        const root = result.root;
        expect(root.hasAttribute('disabled')).toBe(true);
        expect(root.hasAttribute('aria-disabled')).toBe(false);
        const user = userEvent.setup();
        await user.click(root);
        expect(root.getAttribute('aria-checked')).toBe('false');
      } finally {
        result.cleanup();
      }
    });
  });
}
