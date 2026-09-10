import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/color-picker/color-picker.element';

interface Scene {
  color?: { l: number; c: number; h: number };
  maxChroma?: number;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
}

const DEFAULT = { l: 0.7, c: 0.15, h: 250 };

async function mount({
  color = DEFAULT,
  maxChroma = 0.4,
  disabled = false,
  dir,
}: Scene): Promise<HTMLElement> {
  // The same light-DOM markup the Astro performance emits: containers with
  // canvases and aria-hidden thumbs, three channel inputs, and the preview.
  const rootAttrs = [
    'data-part="root"',
    'id="cp-root"',
    'role="group"',
    'aria-label="Color picker"',
    `data-max-chroma="${maxChroma}"`,
    `data-default-l="${color.l}"`,
    `data-default-c="${color.c}"`,
    `data-default-h="${color.h}"`,
    disabled ? 'data-disabled="true" aria-disabled="true"' : '',
    dir ? `dir="${dir}"` : '',
  ].join(' ');
  const disabledAttr = disabled ? ' disabled' : '';
  document.body.innerHTML = `
    <main>
      <rafters-color-picker>
        <div ${rootAttrs}>
          <div data-part="area" id="cp-area" aria-label="Lightness and chroma">
            <canvas></canvas>
            <div data-role="thumb" aria-hidden="true"></div>
          </div>
          <div data-part="hue" id="cp-hue" aria-label="Hue">
            <canvas></canvas>
            <div data-role="thumb" aria-hidden="true"></div>
          </div>
          <div>
            <input data-channel="l"${disabledAttr}>
            <input data-channel="c"${disabledAttr}>
            <input data-channel="h"${disabledAttr}>
          </div>
          <div>
            <div data-part="preview" id="cp-preview"></div>
            <span data-part="gamut-label" aria-hidden="true"></span>
          </div>
        </div>
      </rafters-color-picker>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

/**
 * These scenes carry a raised timeout, and the reason is the component, not the
 * audit. Measured in this project on the same run: Badge renders in 10ms,
 * ColorPicker in 1840ms and 1717ms on a repeat, so the cost is per render and
 * not module initialisation. Splitting one scene gives render 1848ms against
 * axe 65ms over 15 DOM nodes -- axe is doing almost nothing. Locally each scene
 * lands near 2s; the CI runner is roughly eight times slower and crosses the
 * 15s default. The render cost is tracked as #2345, and this raise comes out
 * when that lands.
 */
const SLOW_COMPONENT_TIMEOUT = 60_000;

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', {}],
  ['custom color', { color: { l: 0.3, c: 0.2, h: 90 } }],
  ['high chroma range', { maxChroma: 0.5 }],
  ['disabled', { disabled: true }],
  ['right-to-left', { dir: 'rtl' }],
];

for (const [name, scene] of scenes) {
  test(
    `rafters-color-picker ${name}`,
    async ({ task }) => {
      const host = await mount(scene);
      const results = await runAxe(host);
      task.meta.axe = results;
      expect(results.violations).toEqual([]);
    },
    SLOW_COMPONENT_TIMEOUT,
  );
}
