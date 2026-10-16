import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/kbd/kbd.element';

function mount(keys: string[]): HTMLElement {
  const caps = keys.map((key) => `<rafters-kbd>${key}</rafters-kbd>`).join(' + ');
  document.body.innerHTML = `<main><p>Press ${caps}</p></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string[]]> = [
  ['single key', ['Enter']],
  ['two-key combination', ['Cmd', 'S']],
  ['three-key combination', ['Ctrl', 'Shift', 'P']],
  ['glyph key', ['⌘']],
];

for (const [name, keys] of scenes) {
  test(`rafters-kbd ${name}`, async ({ task }) => {
    const host = mount(keys);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
