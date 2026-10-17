import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input/input.element';

const ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16"><title>Magnifier</title><path d="M2 4h20v16H2z"/></svg>';
const START = `<span slot="start-icon">${ICON}</span>`;
const END = `<span slot="end-icon">${ICON}</span>`;

const scenes: ReadonlyArray<[string, string, string]> = [
  ['bare', '', ''],
  ['invalid', 'invalid', '<div data-part="error" id="err">Required</div>'],
  ['required', 'required', ''],
  ['disabled', 'disabled', ''],
  ['readonly', 'readonly value="Ada"', ''],
  ['seeded value', 'value="Ada"', ''],
  ['start icon', '', START],
  ['end icon', '', END],
  ['both icons', '', START + END],
];

for (const [name, attrs, children] of scenes) {
  test(`rafters-input ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-input aria-label="Name" ${attrs}>${children}</rafters-input></main>`;
    await Promise.resolve();
    const host = document.body.querySelector('main') as HTMLElement;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
