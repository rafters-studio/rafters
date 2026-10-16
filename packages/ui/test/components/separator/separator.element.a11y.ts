import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/separator/separator.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['decorative', '<rafters-separator></rafters-separator>'],
  ['semantic', '<rafters-separator decorative=""></rafters-separator>'],
  [
    'semantic vertical',
    '<rafters-separator orientation="vertical" decorative=""></rafters-separator>',
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-separator ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><p>Above</p>${markup}<p>Below</p></main>`;
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
