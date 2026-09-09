import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  ColorPicker,
  type ColorPickerProps,
} from '../../../src/components/color-picker/color-picker';

const scenes: ReadonlyArray<[string, ColorPickerProps]> = [
  ['default', {}],
  ['custom color', { defaultValue: { l: 0.3, c: 0.2, h: 90 } }],
  ['high chroma range', { maxChroma: 0.5 }],
  ['disabled', { disabled: true }],
  ['controlled value', { value: { l: 0.5, c: 0.1, h: 180 } }],
  ['right-to-left', { dir: 'rtl' }],
];

for (const [name, props] of scenes) {
  test(`color-picker ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <ColorPicker {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
