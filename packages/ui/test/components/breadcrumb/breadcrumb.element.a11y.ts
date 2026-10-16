import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/breadcrumb/breadcrumb.element';

test('breadcrumb.element full trail has no axe violations', async ({ task }) => {
  document.body.innerHTML =
    '<main><rafters-breadcrumb><ol>' +
    '<li><a href="/">Home</a></li>' +
    '<li role="presentation" aria-hidden="true">/</li>' +
    '<li><a href="/docs">Docs</a></li>' +
    '<li role="presentation" aria-hidden="true">/</li>' +
    '<li><span role="link" aria-disabled="true" aria-current="page">Breadcrumb</span></li>' +
    '</ol></rafters-breadcrumb></main>';
  await Promise.resolve();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
