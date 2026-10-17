import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/typography/typography.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['heading', '<rafters-typography variant="h1">Page title</rafters-typography>'],
  ['paragraph', '<rafters-typography>Body text</rafters-typography>'],
  ['blockquote', '<rafters-typography variant="blockquote">A quotation</rafters-typography>'],
  ['code span', '<p>Use <rafters-typography variant="code">useState</rafters-typography> here</p>'],
  ['list', '<rafters-typography variant="ul"><li>One</li><li>Two</li></rafters-typography>'],
];

for (const [name, html] of scenes) {
  test(`rafters-typography ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${html}</main>`;
    const host = document.body.querySelector('main') as HTMLElement;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
