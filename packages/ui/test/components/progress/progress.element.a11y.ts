import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/progress/progress.element';

const INDICATOR = '<div data-part="indicator"></div>';

test('progress.element named determinate has no axe violations', async ({ task }) => {
  document.body.innerHTML = `<main><rafters-progress data-part="root" data-value="40" aria-label="Upload">${INDICATOR}</rafters-progress></main>`;
  await Promise.resolve();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('progress.element named indeterminate has no axe violations', async ({ task }) => {
  document.body.innerHTML = `<main><rafters-progress data-part="root" aria-label="Loading">${INDICATOR}</rafters-progress></main>`;
  await Promise.resolve();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('progress.element with no name is flagged aria-progressbar-name', async ({ task }) => {
  document.body.innerHTML = `<main><rafters-progress data-part="root" data-value="40">${INDICATOR}</rafters-progress></main>`;
  await Promise.resolve();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations.map((v) => v.id)).toContain('aria-progressbar-name');
});
