import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/button/button.element';

const scenes: ReadonlyArray<[string, string, string]> = [
  ['idle', '', 'Save'],
  ['loading', 'loading', 'Save'],
  ['soft-disabled', 'soft-disabled', 'Save'],
  ['disabled', 'disabled', 'Save'],
  ['toggle', 'toggle', 'Bold'],
  ['icons', '', '<svg slot="start-icon"></svg>Send<svg slot="end-icon"></svg>'],
  ['icon-only named', 'size="icon" aria-label="Close"', '<svg></svg>'],
];

for (const [name, attrs, content] of scenes) {
  test(`rafters-button ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-button ${attrs}>${content}</rafters-button></main>`;
    await Promise.resolve();
    await Promise.resolve();
    const results = await runAxe(document.body.querySelector('main') as HTMLElement);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
