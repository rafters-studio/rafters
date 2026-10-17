import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/container/container.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['main', '<rafters-container as="main"><p>Body</p></rafters-container>'],
  ['header', '<rafters-container as="header"><p>Head</p></rafters-container>'],
  ['footer', '<rafters-container as="footer"><p>Foot</p></rafters-container>'],
  ['aside', '<rafters-container as="aside"><p>Side</p></rafters-container>'],
  [
    'section with aria-label',
    '<main><rafters-container as="section" aria-label="Pricing"><p>Plans</p></rafters-container></main>',
  ],
];

for (const [name, markup] of scenes) {
  test(`rafters-container ${name}`, async ({ task }) => {
    document.body.innerHTML = markup;
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
