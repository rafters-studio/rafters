/**
 * Color picker conformance suite -- one suite, run per render adapter.
 * The React and WC conformance tests each provide their adapter and call
 * runColorPickerConformance. Astro drives the same score from its own file.
 */
import { describe, expect, it } from 'vitest';
import {
  colorPickerBehavior,
  DEFAULT_MAX_CHROMA,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  partElement,
  type RenderResult,
} from '../../harness/conformance';

export interface ColorPickerScenarioProps {
  defaultValue?: { l: number; c: number; h: number };
  maxChroma?: number;
  disabled?: boolean;
}

export interface ColorPickerAdapter {
  name: string;
  render(props: ColorPickerScenarioProps): RenderResult | Promise<RenderResult>;
}

interface Scenario {
  name: string;
  props: ColorPickerScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'default', props: {} },
  { name: 'custom color', props: { defaultValue: { l: 0.3, c: 0.2, h: 90 } } },
  { name: 'high chroma range', props: { maxChroma: 0.5 } },
  { name: 'disabled', props: { disabled: true } },
];

const EXPECTED_PARTS = ['root', 'area', 'hue', 'preview'] as const;

export function configFor(props: ColorPickerScenarioProps): ColorPickerConfig {
  return {
    maxChroma: props.maxChroma ?? DEFAULT_MAX_CHROMA,
    disabled: props.disabled ?? false,
    defaultValue: props.defaultValue,
  };
}

export function runColorPickerConformance(adapter: ColorPickerAdapter): void {
  describe(`color-picker conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props);
        try {
          const config = configFor(scenario.props);
          const state = colorPickerBehavior.initialState(config);
          assertContractFulfillment(
            colorPickerBehavior,
            result.root,
            state,
            config,
            EXPECTED_PARTS,
          );
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: area and hue canvases are present`, async () => {
        const result = await adapter.render(scenario.props);
        try {
          const area = partElement(result.root, 'area');
          expect(area?.querySelector('canvas')).not.toBeNull();
          const hue = partElement(result.root, 'hue');
          expect(hue?.querySelector('canvas')).not.toBeNull();
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: three numeric inputs with data-channel`, async () => {
        const result = await adapter.render(scenario.props);
        try {
          for (const channel of ['l', 'c', 'h']) {
            const input = result.root.querySelector(`[data-channel="${channel}"]`);
            expect(input, `input for channel ${channel}`).not.toBeNull();
          }
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props);
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }
  });
}
