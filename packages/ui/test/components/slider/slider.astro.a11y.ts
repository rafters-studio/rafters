import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Slider from '../../../src/components/slider/slider.astro';
import { bindSlider } from '../../../src/components/slider/slider.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  // A slider has no intrinsic text, so every scene names each thumb with the
  // same `aria-label` the conformance test applies.
  const html = await container.renderToString(Slider, {
    props: { id: 's', 'aria-label': 'Volume', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindSlider(document.querySelector('div[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['single default', { defaultValue: [50] }],
  ['range two thumbs', { defaultValue: [25, 75] }],
  ['small at min', { size: 'sm', defaultValue: [0] }],
  ['destructive lg', { variant: 'destructive', size: 'lg', defaultValue: [60] }],
  ['vertical', { orientation: 'vertical', defaultValue: [40] }],
  ['stepped custom range', { min: 10, max: 20, step: 2, defaultValue: [14] }],
  ['disabled', { disabled: true, defaultValue: [30] }],
  ['form associated', { name: 'volume', defaultValue: [25, 75] }],
];

for (const [name, props] of scenes) {
  test(`slider.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
