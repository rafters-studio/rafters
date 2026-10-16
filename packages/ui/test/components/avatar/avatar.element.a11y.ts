import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/avatar/avatar.element';

const SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const scenes: ReadonlyArray<[string, string]> = [
  ['meaningful image', `<rafters-avatar src="${SRC}" alt="Ada Lovelace">AL</rafters-avatar>`],
  ['fallback', '<rafters-avatar>AL</rafters-avatar>'],
];

for (const [name, html] of scenes) {
  test(`avatar.element ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${html}</main>`;
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
