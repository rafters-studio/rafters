/**
 * Slider conformance suite -- one suite, run per render adapter. The React and
 * WC conformance tests are each their adapter plus a call into
 * runSliderConformance. Astro drives the same score from its own file.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { sliderBehavior, type SliderConfig } from '../../../src/components/slider/slider.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
  partElements,
  type RenderResult,
} from '../../harness/conformance';

export interface SliderScenarioProps {
  variant?: SliderConfig['variant'];
  size?: SliderConfig['size'];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  orientation?: SliderConfig['orientation'];
  disabled?: boolean;
}

export interface SliderAdapter {
  name: string;
  /** Every scenario carries an accessible name: a slider has no intrinsic text,
   *  so the adapter always applies `label` as each thumb's accessible name. */
  render(props: SliderScenarioProps, label: string): RenderResult | Promise<RenderResult>;
}

interface Scenario {
  name: string;
  props: SliderScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'single default', props: { value: [50] } },
  { name: 'range two thumbs', props: { value: [25, 75] } },
  { name: 'small at min', props: { size: 'sm', value: [0] } },
  { name: 'destructive lg', props: { variant: 'destructive', size: 'lg', value: [60] } },
  { name: 'vertical', props: { orientation: 'vertical', value: [40] } },
  { name: 'stepped custom range', props: { min: 10, max: 20, step: 2, value: [14] } },
  { name: 'disabled', props: { disabled: true, value: [30] } },
];

const EXPECTED_PARTS = ['root', 'track', 'range', 'thumb'] as const;

export function configFor(props: SliderScenarioProps): SliderConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    min: props.min ?? 0,
    max: props.max ?? 100,
    step: props.step ?? 1,
    orientation: props.orientation ?? 'horizontal',
    defaultValue: props.value ?? [50],
    disabled: props.disabled ?? false,
  };
}

export function runSliderConformance(adapter: SliderAdapter): void {
  describe(`slider conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Volume');
        try {
          const config = configFor(scenario.props);
          const state = sliderBehavior.initialState(config);
          assertContractFulfillment(sliderBehavior, result.root, state, config, EXPECTED_PARTS);
          assertInstanceAriaFulfillment(sliderBehavior, result.root, state, config);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: one thumb per value, each a role=slider`, async () => {
        const result = await adapter.render(scenario.props, 'Volume');
        try {
          const thumbs = partElements(result.root, 'thumb');
          expect(thumbs.length).toBe((scenario.props.value ?? [50]).length);
          for (const thumb of thumbs) expect(thumb.getAttribute('role')).toBe('slider');
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Volume');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('ArrowRight/ArrowUp step up, ArrowLeft/ArrowDown step down', async () => {
      const result = await adapter.render({ value: [50] }, 'Volume');
      try {
        const thumb = partElement(result.root, 'thumb');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('50');
        const user = userEvent.setup();
        thumb?.focus();
        await user.keyboard('{ArrowRight}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('51');
        await user.keyboard('{ArrowUp}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('52');
        await user.keyboard('{ArrowLeft}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('51');
        await user.keyboard('{ArrowDown}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('50');
      } finally {
        result.cleanup();
      }
    });

    it('Home jumps to min, End jumps to max, PageUp/PageDown move ten steps', async () => {
      const result = await adapter.render({ value: [50] }, 'Volume');
      try {
        const thumb = partElement(result.root, 'thumb');
        const user = userEvent.setup();
        thumb?.focus();
        await user.keyboard('{Home}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('0');
        await user.keyboard('{End}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('100');
        await user.keyboard('{PageDown}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('90');
        await user.keyboard('{PageUp}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('100');
      } finally {
        result.cleanup();
      }
    });

    it('a custom step snaps arrow movement to the grid', async () => {
      const result = await adapter.render({ min: 10, max: 20, step: 2, value: [14] }, 'Volume');
      try {
        const thumb = partElement(result.root, 'thumb');
        const user = userEvent.setup();
        thumb?.focus();
        await user.keyboard('{ArrowRight}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('16');
        await user.keyboard('{Home}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('10');
      } finally {
        result.cleanup();
      }
    });

    it('disabled: keyboard does not move the thumb', async () => {
      const result = await adapter.render({ disabled: true, value: [30] }, 'Volume');
      try {
        const thumb = partElement(result.root, 'thumb');
        expect(thumb?.getAttribute('tabindex')).toBe('-1');
        const user = userEvent.setup();
        thumb?.focus();
        await user.keyboard('{ArrowRight}');
        expect(thumb?.getAttribute('aria-valuenow')).toBe('30');
      } finally {
        result.cleanup();
      }
    });
  });
}
