import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ColorPicker from '../../../src/components/color-picker/color-picker.astro';
import { bindColorPicker } from '../../../src/components/color-picker/color-picker.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ColorPicker, { props: { id: 'cp', ...props } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindColorPicker(document.querySelector('div[data-part="root"][data-max-chroma]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['default', {}],
  ['custom color', { defaultValue: { l: 0.3, c: 0.2, h: 90 } }],
  ['high chroma range', { maxChroma: 0.5 }],
  ['disabled', { disabled: true }],
  ['right-to-left', { dir: 'rtl' }],
];

for (const [name, props] of scenes) {
  test(`color-picker.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
