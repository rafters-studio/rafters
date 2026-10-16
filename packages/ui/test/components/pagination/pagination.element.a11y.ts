import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/pagination/pagination.element';
import { paginationContentClasses } from '../../../src/components/pagination/pagination.classes';

test('pagination.element full slotted trail has no axe violations', async ({ task }) => {
  document.body.innerHTML =
    '<main><rafters-pagination>' +
    `<ul class="${paginationContentClasses}">` +
    '<li><a href="/page/1" aria-label="Go to previous page">Previous</a></li>' +
    '<li><a href="/page/1">1</a></li>' +
    '<li><a href="/page/2" aria-current="page">2</a></li>' +
    '<li><a href="/page/3">3</a></li>' +
    '<li><span aria-hidden="true">...<span class="sr-only">More pages</span></span></li>' +
    '<li><a href="/page/3" aria-label="Go to next page">Next</a></li>' +
    '</ul></rafters-pagination></main>';
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
