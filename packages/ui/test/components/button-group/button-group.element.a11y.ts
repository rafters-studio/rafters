import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/button-group/button-group.element';

const TWO_BUTTONS = '<button type="button">Bold</button><button type="button">Italic</button>';
const THREE_BUTTONS =
  '<button type="button">Grid</button><button type="button">List</button><button type="button">Table</button>';
const TOGGLES =
  '<button type="button" aria-pressed="true">Grid</button><button type="button" aria-pressed="false">List</button>';

function mount(attrs: string, slot: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-button-group ${attrs}>${slot}</rafters-button-group></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string, string]> = [
  ['horizontal', 'aria-label="Text style"', TWO_BUTTONS],
  ['vertical', 'orientation="vertical" aria-label="View"', THREE_BUTTONS],
  [
    'unknown orientation falls back to horizontal',
    'orientation="sideways" aria-label="View"',
    TWO_BUTTONS,
  ],
  ['toggle set', 'aria-label="View options"', TOGGLES],
];

for (const [name, attrs, slot] of scenes) {
  test(`rafters-button-group ${name}`, async ({ task }) => {
    const host = mount(attrs, slot);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
