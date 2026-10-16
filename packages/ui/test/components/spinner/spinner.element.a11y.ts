import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/spinner/spinner.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['default', '<rafters-spinner></rafters-spinner>'],
  ['size=sm', '<rafters-spinner size="sm"></rafters-spinner>'],
  ['size=lg', '<rafters-spinner size="lg"></rafters-spinner>'],
  ['variant=muted', '<rafters-spinner variant="muted"></rafters-spinner>'],
  ['variant=destructive', '<rafters-spinner variant="destructive"></rafters-spinner>'],
];

for (const [name, html] of scenes) {
  test(`spinner.element ${name}`, async ({ task }) => {
    // A spinner is inline content, not a landmark; the page supplies the landmark.
    document.body.innerHTML = `<main>${html}</main>`;
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
