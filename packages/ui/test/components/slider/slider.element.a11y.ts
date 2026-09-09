import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/slider/slider.element';
import {
  effectiveValues,
  percentFor,
  sliderBehavior,
  sliderThumbAria,
  type SliderConfig,
} from '../../../src/components/slider/slider.behavior';
import { sliderClasses } from '../../../src/components/slider/slider.classes';

interface Scene {
  variant?: SliderConfig['variant'];
  size?: SliderConfig['size'];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  orientation?: SliderConfig['orientation'];
  disabled?: boolean;
}

function configFor(scene: Scene): SliderConfig {
  return {
    variant: scene.variant ?? 'default',
    size: scene.size ?? 'default',
    min: scene.min ?? 0,
    max: scene.max ?? 100,
    step: scene.step ?? 1,
    orientation: scene.orientation ?? 'horizontal',
    defaultValue: scene.value ?? [50],
    disabled: scene.disabled ?? false,
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

/**
 * The element is a light-DOM enhancer: the author provides the container with
 * its track/range/thumb children, the score's initial projection and the
 * thumb geometry already applied -- the markup Astro emits. A slider has no
 * intrinsic text, so every thumb carries the same `aria-label` the
 * conformance suite applies.
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

async function mount(scene: Scene): Promise<HTMLElement> {
  document.body.innerHTML = '<main></main>';
  const main = document.body.querySelector('main') as HTMLElement;
  const host = document.createElement('rafters-slider');
  host.appendChild(buildRoot(configFor(scene), 'Volume'));
  main.appendChild(host);
  await Promise.resolve(); // the element binds one microtask after connecting
  return main;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['single default', { value: [50] }],
  ['range two thumbs', { value: [25, 75] }],
  ['small at min', { size: 'sm', value: [0] }],
  ['destructive lg', { variant: 'destructive', size: 'lg', value: [60] }],
  ['vertical', { orientation: 'vertical', value: [40] }],
  ['stepped custom range', { min: 10, max: 20, step: 2, value: [14] }],
  ['disabled', { disabled: true, value: [30] }],
];

for (const [name, scene] of scenes) {
  test(`rafters-slider ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
