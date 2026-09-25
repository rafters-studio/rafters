/**
 * React performance of the color-picker score, driven end to end.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ColorPicker,
  type ColorPickerProps,
} from '../../../src/components/color-picker/color-picker';
import {
  colorPickerBehavior,
  DEFAULT_MAX_CHROMA,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';

interface ScenarioProps {
  defaultValue?: { l: number; c: number; h: number };
  maxChroma?: number;
  disabled?: boolean;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'default', props: {} },
  { name: 'custom color', props: { defaultValue: { l: 0.3, c: 0.2, h: 90 } } },
  { name: 'high chroma range', props: { maxChroma: 0.5 } },
  { name: 'disabled', props: { disabled: true } },
];

const EXPECTED_PARTS = ['root', 'area', 'hue', 'preview'] as const;

function configFor(props: ScenarioProps): ColorPickerConfig {
  return {
    maxChroma: props.maxChroma ?? DEFAULT_MAX_CHROMA,
    disabled: props.disabled ?? false,
    defaultValue: props.defaultValue,
  };
}

function toProps(props: ScenarioProps): ColorPickerProps {
  return {
    defaultValue: props.defaultValue,
    maxChroma: props.maxChroma,
    disabled: props.disabled,
  };
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly string[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part renders (with its declared role), and the rendered
 *  ARIA equals the score's projection -- including absence: a projected
 *  `undefined` means the attribute must not render. */
function assertContractFulfillment(root: HTMLElement, scenario: ScenarioProps): void {
  const config = configFor(scenario);
  const state = colorPickerBehavior.initialState(config);
  const ids = domPartIds(root, EXPECTED_PARTS);
  const projection = colorPickerBehavior.aria(state, config, ids);

  for (const part of EXPECTED_PARTS) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = colorPickerBehavior.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
    const attrs = projection[part];
    if (!attrs) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

function renderColorPicker(props: ScenarioProps): { root: HTMLElement } {
  const { container } = render(<ColorPicker {...toProps(props)} />);
  const root = container.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no [data-part="root"] rendered');
  return { root };
}

afterEach(() => {
  cleanup();
});

describe('color-picker [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      const { root } = renderColorPicker(scenario.props);
      assertContractFulfillment(root, scenario.props);
    });

    it(`${scenario.name}: area and hue canvases are present`, () => {
      const { root } = renderColorPicker(scenario.props);
      const area = partElement(root, 'area');
      expect(area?.querySelector('canvas')).not.toBeNull();
      const hue = partElement(root, 'hue');
      expect(hue?.querySelector('canvas')).not.toBeNull();
    });

    it(`${scenario.name}: three numeric inputs with data-channel`, () => {
      const { root } = renderColorPicker(scenario.props);
      for (const channel of ['l', 'c', 'h']) {
        const input = root.querySelector(`[data-channel="${channel}"]`);
        expect(input, `input for channel ${channel}`).not.toBeNull();
      }
    });
  }
});
