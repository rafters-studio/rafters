import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  ColorPicker,
  type ColorPickerProps,
} from '../../../src/components/color-picker/color-picker';

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

const scenes: ReadonlyArray<[string, ColorPickerProps]> = [
  ['default', {}],
  ['custom color', { defaultValue: { l: 0.3, c: 0.2, h: 90 } }],
  ['high chroma range', { maxChroma: 0.5 }],
  ['disabled', { disabled: true }],
  ['controlled value', { value: { l: 0.5, c: 0.1, h: 180 } }],
  ['right-to-left', { dir: 'rtl' }],
];

for (const [name, props] of scenes) {
  test(
    `color-picker ${name}`,
    async ({ task }) => {
      const { container } = await render(
        <main>
          <ColorPicker {...props} />
        </main>,
      );
      const results = await runAxe(container);
      task.meta.axe = results;
      expect(results.violations).toEqual([]);
    },
    SLOW_COMPONENT_TIMEOUT,
  );
}
