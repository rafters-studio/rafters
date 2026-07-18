/**
 * Checkbox conformance suite -- one suite, run per render adapter.
 * The React, WC, and Astro conformance tests are each their adapter plus a call
 * into runCheckboxConformance.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  checkbox,
  type CheckboxConfig,
  type CheckedState,
} from '../../../src/components/checkbox/checkbox.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  type RenderResult,
} from '../../harness/conformance';

export interface CheckboxScenarioProps {
  checked?: CheckedState;
  disabled?: boolean;
  required?: boolean;
  variant?: CheckboxConfig['variant'];
  size?: CheckboxConfig['size'];
}

export interface CheckboxAdapter {
  name: string;
  render(props: CheckboxScenarioProps, label: string): RenderResult | Promise<RenderResult>;
}

interface Scenario {
  name: string;
  props: CheckboxScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked default', props: {} },
  { name: 'checked', props: { checked: true } },
  { name: 'indeterminate', props: { checked: 'indeterminate' } },
  { name: 'required', props: { required: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'destructive lg checked', props: { checked: true, variant: 'destructive', size: 'lg' } },
];

function configFor(props: CheckboxScenarioProps): CheckboxConfig {
  return {
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
  };
}

export function runCheckboxConformance(adapter: CheckboxAdapter): void {
  describe(`checkbox conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Accept terms');
        try {
          const config = configFor(scenario.props);
          const state = checkbox.initialState(config);
          assertContractFulfillment(checkbox, result.root, state, config, ['root']);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Accept terms');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('Space toggles aria-checked false -> true -> false (native button key path)', async () => {
      const result = await adapter.render({}, 'Subscribe');
      try {
        const root = result.root;
        expect(root.getAttribute('aria-checked')).toBe('false');
        const user = userEvent.setup();
        root.focus();
        await user.keyboard(' ');
        expect(partElement(root, 'root')?.getAttribute('aria-checked')).toBe('true');
        expect(partElement(root, 'root')?.getAttribute('data-state')).toBe('checked');
        await user.keyboard(' ');
        expect(partElement(root, 'root')?.getAttribute('aria-checked')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('click toggles the checked axis', async () => {
      const result = await adapter.render({}, 'Subscribe');
      try {
        const user = userEvent.setup();
        await user.click(result.root);
        expect(result.root.getAttribute('aria-checked')).toBe('true');
      } finally {
        result.cleanup();
      }
    });

    it('indeterminate toggles to checked (mixed -> true), never back to mixed', async () => {
      const result = await adapter.render({ checked: 'indeterminate' }, 'Select all');
      try {
        expect(result.root.getAttribute('aria-checked')).toBe('mixed');
        const user = userEvent.setup();
        await user.click(result.root);
        expect(result.root.getAttribute('aria-checked')).toBe('true');
      } finally {
        result.cleanup();
      }
    });

    it('hard disabled: native disabled, no aria-disabled, click does not toggle', async () => {
      const result = await adapter.render({ disabled: true }, 'Locked');
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
