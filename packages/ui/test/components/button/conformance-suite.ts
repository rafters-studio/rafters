/**
 * Button conformance suite -- one suite, run per render adapter.
 * The React and WC conformance tests are each their adapter plus a call
 * into runButtonConformance.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  partText,
  type RenderResult,
} from '../../harness/conformance';

export interface ButtonScenarioProps {
  variant?: ButtonConfig['variant'];
  size?: ButtonConfig['size'];
  disabled?: boolean;
  softDisabled?: boolean;
  loading?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

export interface ButtonAdapter {
  name: string;
  render(props: ButtonScenarioProps, label: string): RenderResult | Promise<RenderResult>;
  /** The icon-only accessible-name pattern is binding-specific; adapters
   *  that cannot express it (WC host aria-label does not cross the shadow
   *  boundary onto the inner button) opt out. */
  supportsIconLabel: boolean;
}

interface Scenario {
  name: string;
  props: ButtonScenarioProps;
  expectedParts: ReadonlyArray<'root' | 'label' | 'spinner'>;
  iconLabel?: boolean;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'idle default', props: {}, expectedParts: ['root', 'label'] },
  {
    name: 'destructive lg',
    props: { variant: 'destructive', size: 'lg' },
    expectedParts: ['root', 'label'],
  },
  { name: 'loading', props: { loading: true }, expectedParts: ['root', 'label', 'spinner'] },
  {
    name: 'toggle unpressed',
    props: { toggle: true },
    expectedParts: ['root', 'label'],
  },
  {
    name: 'toggle pressed',
    props: { toggle: true, pressed: true },
    expectedParts: ['root', 'label'],
  },
  {
    name: 'soft-disabled',
    props: { softDisabled: true },
    expectedParts: ['root', 'label'],
  },
  { name: 'hard disabled', props: { disabled: true }, expectedParts: ['root', 'label'] },
  {
    name: 'icon-only with accessible name',
    props: { size: 'icon', ariaLabel: 'Close' },
    expectedParts: ['root', 'label'],
    iconLabel: true,
  },
];

function configFor(props: ButtonScenarioProps): ButtonConfig {
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

export function runButtonConformance(adapter: ButtonAdapter): void {
  describe(`button conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      if (scenario.iconLabel && !adapter.supportsIconLabel) continue;

      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Save changes');
        try {
          const config = configFor(scenario.props);
          const state = button.initialState(config);
          assertContractFulfillment(button, result.root, state, config, scenario.expectedParts);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Save changes');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('toggle: Enter and Space flip aria-pressed through the keymap', async () => {
      const result = await adapter.render({ toggle: true }, 'Mute');
      try {
        const root = result.root;
        expect(root.getAttribute('aria-pressed')).toBe('false');
        const user = userEvent.setup();
        root.focus();
        await user.keyboard('{Enter}');
        expect(partElement(root, 'root')?.getAttribute('aria-pressed')).toBe('true');
        await user.keyboard(' ');
        expect(partElement(root, 'root')?.getAttribute('aria-pressed')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('loading: activation is suppressed, focus is kept, label survives', async () => {
      const result = await adapter.render({ toggle: true, loading: true }, 'Submit');
      try {
        const root = result.root;
        expect(root.hasAttribute('disabled')).toBe(false);
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(partText(root, 'label')).toContain('Submit');
        const user = userEvent.setup();
        await user.click(root);
        expect(root.getAttribute('aria-pressed')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('soft-disabled: discoverable, focusable, suppressed', async () => {
      const result = await adapter.render({ toggle: true, softDisabled: true }, 'Archive');
      try {
        const root = result.root;
        expect(root.hasAttribute('disabled')).toBe(false);
        expect(root.getAttribute('aria-disabled')).toBe('true');
        const user = userEvent.setup();
        await user.click(root);
        expect(root.getAttribute('aria-pressed')).toBe('false');
      } finally {
        result.cleanup();
      }
    });

    it('hard disabled: native disabled only, no redundant aria-disabled', async () => {
      const result = await adapter.render({ disabled: true }, 'Delete');
      try {
        expect(result.root.hasAttribute('disabled')).toBe(true);
        expect(result.root.hasAttribute('aria-disabled')).toBe(false);
      } finally {
        result.cleanup();
      }
    });
  });
}
