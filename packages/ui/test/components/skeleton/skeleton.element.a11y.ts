import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/skeleton/skeleton.element';

function mount(markup: string): HTMLElement {
  document.body.innerHTML = `<main>${markup}</main>`;
  return document.body.querySelector('main') as HTMLElement;
}

// Skeleton is a decorative leaf: the score projects aria-hidden on every
// instance, so there is no labelled form -- only composition varies.
const scenes: ReadonlyArray<[string, string]> = [
  ['default leaf', '<rafters-skeleton></rafters-skeleton>'],
  [
    'several placeholders beside text',
    '<p>Loading the profile.</p><rafters-skeleton></rafters-skeleton><rafters-skeleton></rafters-skeleton><rafters-skeleton></rafters-skeleton>',
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-skeleton ${name}`, async ({ task }) => {
    const host = mount(markup);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
