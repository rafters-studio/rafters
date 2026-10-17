import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/image/image.element';

const SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const scenes: ReadonlyArray<[string, string]> = [
  ['loaded', `<rafters-image src="${SRC}" alt="A sunset over the ocean"></rafters-image>`],
  [
    'loading',
    `<rafters-image src="${SRC}" alt="Loading photo" data-status="loading"></rafters-image>`,
  ],
  ['error', `<rafters-image src="${SRC}" alt="Broken" data-status="error"></rafters-image>`],
  [
    'captioned',
    `<rafters-image src="${SRC}" alt="Photo" caption="Photo by John Doe"></rafters-image>`,
  ],
];

for (const [name, html] of scenes) {
  test(`image.element ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${html}</main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
