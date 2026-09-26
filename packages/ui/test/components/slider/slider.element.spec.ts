/**
 * WC render + performance of the slider score, driven end to end.
 *
 * The Web Component is a light-DOM enhancer: the author provides the real
 * container with its track/range/thumb children so the pointer surface and the
 * role=slider thumbs exist before JS. This test server-renders that markup
 * with the score's initial projection + thumb geometry already applied --
 * what Astro emits -- then lets RaftersSlider hand the root to bindSlider (the
 * SAME controller the React binding composes).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  effectiveValues,
  percentFor,
  sliderBehavior,
  sliderThumbAria,
  type SliderConfig,
} from '../../../src/components/slider/slider.behavior';
import { sliderClasses } from '../../../src/components/slider/slider.classes';
import { RaftersSlider } from '../../../src/components/slider/slider.element';

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

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
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

/**
 * Builds the light-DOM markup an author provides -- the container with its
 * track/range/thumb children, the score's initial projection and the thumb
 * geometry already applied -- the markup Astro emits.
 */
function buildRoot(config: SliderConfig, label: string): HTMLElement {
  const state = sliderBehavior.initialState(config);
  const classes = sliderClasses(config, state);
  const aria = sliderBehavior.aria(state, config, { root: '', track: '', range: '', thumb: '' });
  const values = effectiveValues(state, config);
  const isHorizontal = config.orientation === 'horizontal';

  const root = document.createElement('div');
  root.dataset['part'] = 'root';
  root.id = 'wc-root';
  root.dataset['step'] = String(config.step);
  root.className = classes.root;
  if (aria.root) applyAria(root, aria.root);

  const track = document.createElement('span');
  track.dataset['part'] = 'track';
  track.className = classes.track;
  if (aria.track) applyAria(track, aria.track);

  const range = document.createElement('span');
  range.dataset['part'] = 'range';
  range.className = classes.range;
  if (aria.range) applyAria(range, aria.range);
  track.appendChild(range);
  root.appendChild(track);

  for (const [index, value] of values.entries()) {
    const thumb = document.createElement('span');
    thumb.setAttribute('role', 'slider');
    thumb.dataset['part'] = 'thumb';
    thumb.dataset['index'] = String(index);
    thumb.dataset['value'] = String(value);
    thumb.tabIndex = config.disabled ? -1 : 0;
    thumb.setAttribute('aria-label', label);
    thumb.className = classes.thumb;
    const pct = percentFor(value, config);
    thumb.style.cssText = isHorizontal ? `left:${pct}%;top:50%` : `bottom:${pct}%;left:50%`;
    applyAria(thumb, sliderThumbAria(String(value), state, config));
    root.appendChild(thumb);
  }

  return root;
}

beforeAll(() => {
  if (!customElements.get('rafters-slider')) customElements.define('rafters-slider', RaftersSlider);
});

async function mount(props: ScenarioProps, label: string): Promise<HTMLElement> {
  const config = configFor(props);
  const hostEl = document.createElement('rafters-slider');
  hostEl.appendChild(buildRoot(config, label));
  document.body.appendChild(hostEl);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();

  const root = hostEl.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('wc adapter: no root');
  return root;
}

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

describe('slider [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const root = await mount(scenario.props, 'Volume');
      try {
        const config = configFor(scenario.props);
        const state = sliderBehavior.initialState(config);
        assertAria(root, state, config);
      } finally {
        root.closest('rafters-slider')?.remove();
      }
    });

    it(`${scenario.name}: one thumb per value, each a role=slider`, async () => {
      const root = await mount(scenario.props, 'Volume');
      try {
        const thumbs = partElements(root, 'thumb');
        expect(thumbs.length).toBe((scenario.props.value ?? [50]).length);
        for (const thumb of thumbs) expect(thumb.getAttribute('role')).toBe('slider');
      } finally {
        root.closest('rafters-slider')?.remove();
      }
    });
  }

  it('ArrowRight/ArrowUp step up, ArrowLeft/ArrowDown step down', async () => {
    const root = await mount({ value: [50] }, 'Volume');
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
      root.closest('rafters-slider')?.remove();
    }
  });

  it('Home jumps to min, End jumps to max, PageUp/PageDown move ten steps', async () => {
    const root = await mount({ value: [50] }, 'Volume');
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
      root.closest('rafters-slider')?.remove();
    }
  });

  it('a custom step snaps arrow movement to the grid', async () => {
    const root = await mount({ min: 10, max: 20, step: 2, value: [14] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
      const user = userEvent.setup();
      thumb?.focus();
      await user.keyboard('{ArrowRight}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('16');
      await user.keyboard('{Home}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('10');
    } finally {
      root.closest('rafters-slider')?.remove();
    }
  });

  it('disabled: keyboard does not move the thumb', async () => {
    const root = await mount({ disabled: true, value: [30] }, 'Volume');
    try {
      const thumb = partElement(root, 'thumb');
      expect(thumb?.getAttribute('tabindex')).toBe('-1');
      const user = userEvent.setup();
      thumb?.focus();
      await user.keyboard('{ArrowRight}');
      expect(thumb?.getAttribute('aria-valuenow')).toBe('30');
    } finally {
      root.closest('rafters-slider')?.remove();
    }
  });
});
