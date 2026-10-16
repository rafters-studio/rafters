import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/aspect-ratio/aspect-ratio.element';

test('aspect-ratio.element with img alt inside a landmark', async ({ task }) => {
  document.body.innerHTML =
    '<main><rafters-aspect-ratio ratio="16/9"><img alt="Cover" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></rafters-aspect-ratio></main>';
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
