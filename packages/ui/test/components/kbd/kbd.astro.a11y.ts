import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Kbd from '../../../src/components/kbd/kbd.astro';

async function mount(keys: string[]): Promise<Document> {
  const container = await AstroContainer.create();
  const caps: string[] = [];
  for (const key of keys) {
    caps.push(await container.renderToString(Kbd, { slots: { default: key } }));
  }
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main><p>Press ${caps.join(' + ')}</p></main>`;
  // Kbd is a pure static: no bindKbd exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, string[]]> = [
  ['single key', ['Enter']],
  ['two-key combination', ['Cmd', 'S']],
  ['three-key combination', ['Ctrl', 'Shift', 'P']],
  ['glyph key', ['⌘']],
];

for (const [name, keys] of scenes) {
  test(`kbd.astro ${name}`, async ({ task }) => {
    const document = await mount(keys);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
