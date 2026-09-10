/**
 * React performance of the slider score, driven end to end, plus the
 * retained-mode-only controlled-callback proof (gotcha #1).
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Slider, type SliderProps } from '../../../src/components/slider/slider';
import { sliderClasses } from '../../../src/components/slider/slider.classes';
import {
  sliderBehavior,
  sliderThumbAria,
  type SliderConfig,
} from '../../../src/components/slider/slider.behavior';

interface ScenarioProps {
  variant?: SliderConfig['variant'];
  size?: SliderConfig['size'];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  orientation?: SliderConfig['orientation'];
  disabled?: boolean;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
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

function configFor(props: ScenarioProps): SliderConfig {
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

function toProps(props: ScenarioProps, label: string): SliderProps {
  return {
    variant: props.variant,
    size: props.size,
    defaultValue: props.value,
    min: props.min,
    max: props.max,
    step: props.step,
    orientation: props.orientation,
    disabled: props.disabled,
    'aria-label': label,
  };
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
  if (root.getAttribute('data-part') === part) all.unshift(root);
  return all;
}

function renderSlider(props: ScenarioProps, label: string) {
  const utils = render(<Slider {...toProps(props, label)} />);
  const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no [data-part="root"] rendered');
  return { root, unmount: utils.unmount };
}

/** Asserts the root/track/range parts' aria against the score's projection,
 *  and each thumb instance's aria via sliderThumbAria (Spec 01 many-part). */
function assertAria(
  root: HTMLElement,
  state: ReturnType<typeof sliderBehavior.initialState>,
  config: SliderConfig,
) {
  for (const part of EXPECTED_PARTS) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const allParts = Object.keys(sliderBehavior.parts) as Array<(typeof EXPECTED_PARTS)[number]>;
  const ids = {} as Record<(typeof EXPECTED_PARTS)[number], string>;
  for (const part of allParts) ids[part] = partElement(root, part)?.id ?? '';
  const projection = sliderBehavior.aria(state, config, ids);
  for (const part of ['root', 'track', 'range'] as const) {
    const attrs = projection[part];
    const element = partElement(root, part);
    if (!attrs || !element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
  for (const thumb of partElements(root, 'thumb')) {
    const value = thumb.dataset['value'];
    if (value === undefined) continue;
    const attrs = sliderThumbAria(value, state, config);
    for (const [attr, projectedValue] of Object.entries(attrs)) {
      if (projectedValue === undefined) {
        expect(thumb.hasAttribute(attr), `thumb "${value}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(thumb.getAttribute(attr), `thumb "${value}" ${attr}`).toBe(String(projectedValue));
      }
    }
  }
}

describe('slider conformance [react]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, () => {
      const { root, unmount } = renderSlider(scenario.props, 'Volume');
      try {
        const config = configFor(scenario.props);
        const state = sliderBehavior.initialState(config);
        assertAria(root, state, config);
      } finally {
        unmount();
      }
    });

    it(`${scenario.name}: every part carries the class string the resolver computes`, () => {
      // The scenario table varies variant and size, axes the ARIA projection
      // never reads. Without this the two axes are decoration on a table
      // nothing consumes, and the render-to-class link is untested: the
      // classes file is proven in isolation, but not that the rendered
      // element actually receives what it computed.
      const { root, unmount } = renderSlider(scenario.props, 'Volume');
      try {
        const config = configFor(scenario.props);
        const state = sliderBehavior.initialState(config);
        const classes = sliderClasses(config, state);
        expect(root.className).toBe(classes.root);
        expect(partElement(root, 'track').className).toBe(classes.track);
        expect(partElement(root, 'range').className).toBe(classes.range);
        for (const thumb of partElements(root, 'thumb')) {
          expect(thumb.className).toBe(classes.thumb);
        }
      } finally {
        unmount();
      }
    });

    it(`${scenario.name}: one thumb per value, each a role=slider`, () => {
      const { root, unmount } = renderSlider(scenario.props, 'Volume');
      try {
        const thumbs = partElements(root, 'thumb');
        expect(thumbs.length).toBe((scenario.props.value ?? [50]).length);
        for (const thumb of thumbs) expect(thumb.getAttribute('role')).toBe('slider');
      } finally {
        unmount();
      }
    });
  }

  it('ArrowRight/ArrowUp step up, ArrowLeft/ArrowDown step down', async () => {
    const { root, unmount } = renderSlider({ value: [50] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
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
      unmount();
    }
  });

  it('Home jumps to min, End jumps to max, PageUp/PageDown move ten steps', async () => {
    const { root, unmount } = renderSlider({ value: [50] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
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
      unmount();
    }
  });

  it('a custom step snaps arrow movement to the grid', async () => {
    const { root, unmount } = renderSlider({ min: 10, max: 20, step: 2, value: [14] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
      const user = userEvent.setup();
      thumb?.focus();
      await user.keyboard('{ArrowRight}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('16');
      await user.keyboard('{Home}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('10');
    } finally {
      unmount();
    }
  });

  it('disabled: keyboard does not move the thumb', async () => {
    const { root, unmount } = renderSlider({ disabled: true, value: [30] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
      expect(thumb?.getAttribute('tabindex')).toBe('-1');
      const user = userEvent.setup();
      thumb?.focus();
      await user.keyboard('{ArrowRight}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('30');
    } finally {
      unmount();
    }
  });
});

describe('slider controlled callback [react]', () => {
  it('a controlled slider never moves its own aria-valuenow but reports every change', async () => {
    const changes: number[][] = [];
    const { container } = render(
      <Slider value={[50]} onValueChange={(next) => changes.push(next)} aria-label="Volume" />,
    );
    const thumb = container.querySelector<HTMLElement>('[data-part="thumb"]');
    if (!thumb) throw new Error('no thumb');
    const user = userEvent.setup();
    thumb.focus();

    await user.keyboard('{ArrowRight}');
    // Effective value is pinned by the controlled prop -> stays 50...
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    // ...but the callback reports the value the consumer should adopt.
    expect(changes).toEqual([[51]]);

    await user.keyboard('{ArrowRight}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    expect(changes).toEqual([[51], [51]]);
  });

  it('a range reports the re-sorted array when a thumb crosses its neighbour', async () => {
    const changes: number[][] = [];
    const { container } = render(
      <Slider
        defaultValue={[20, 80]}
        onValueChange={(next) => changes.push(next)}
        aria-label="Range"
      />,
    );
    const thumbs = container.querySelectorAll<HTMLElement>('[data-part="thumb"]');
    const user = userEvent.setup();
    thumbs[0]?.focus();
    await user.keyboard('{End}'); // low thumb jumps to 100, past the high thumb
    // The reported array is always ascending.
    expect(changes.at(-1)).toEqual([80, 100]);
  });
});
