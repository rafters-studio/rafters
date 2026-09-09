import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/scroll-area/scroll-area.element';

function mount(attrs: string, content: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-scroll-area ${attrs}>${content}</rafters-scroll-area></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const LIST = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';

const scenes: ReadonlyArray<[string, string, string]> = [
  ['vertical', '', '<p>Body</p>'],
  ['horizontal', 'orientation="horizontal"', '<p>Body</p>'],
  ['both', 'orientation="both"', '<p>Body</p>'],
  ['with list content', '', LIST],
];

for (const [name, attrs, content] of scenes) {
  test(`rafters-scroll-area ${name}`, async ({ task }) => {
    const host = mount(attrs, content);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
