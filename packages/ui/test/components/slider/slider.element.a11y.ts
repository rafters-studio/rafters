import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/slider/slider.element';
import type { SliderConfig } from '../../../src/components/slider/slider.behavior';
import { buildRoot } from './conformance-suite';

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
