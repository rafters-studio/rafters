import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Pagination from '../../../src/components/pagination/pagination.astro';

// The Astro performance owns only the nav landmark; the trail is the
// consumer's slotted markup. These are the trails a consumer would slot in.
const ELLIPSIS =
  '<li><span aria-hidden="true">...<span class="sr-only">More pages</span></span></li>';

const FIRST_PAGE = `
  <ul class="flex flex-row items-center gap-1">
    <li><a href="/page/1" aria-label="Go to previous page" aria-disabled="true">Previous</a></li>
    <li><a href="/page/1" aria-current="page">1</a></li>
    <li><a href="/page/2">2</a></li>
    ${ELLIPSIS}
    <li><a href="/page/10">10</a></li>
    <li><a href="/page/2" aria-label="Go to next page">Next</a></li>
  </ul>`;

const MIDDLE_PAGE = `
  <ul class="flex flex-row items-center gap-1">
    <li><a href="/page/4" aria-label="Go to previous page">Previous</a></li>
    <li><a href="/page/1">1</a></li>
    ${ELLIPSIS}
    <li><a href="/page/4">4</a></li>
    <li><a href="/page/5" aria-current="page">5</a></li>
    <li><a href="/page/6">6</a></li>
    ${ELLIPSIS}
    <li><a href="/page/10">10</a></li>
    <li><a href="/page/6" aria-label="Go to next page">Next</a></li>
  </ul>`;

const LAST_PAGE = `
  <ul class="flex flex-row items-center gap-1">
    <li><a href="/page/9" aria-label="Go to previous page">Previous</a></li>
    <li><a href="/page/1">1</a></li>
    ${ELLIPSIS}
    <li><a href="/page/9">9</a></li>
    <li><a href="/page/10" aria-current="page">10</a></li>
    <li><a href="/page/10" aria-label="Go to next page" aria-disabled="true">Next</a></li>
  </ul>`;

const BUTTONS = `
  <ul class="flex flex-row items-center gap-1">
    <li><button type="button" aria-label="Go to previous page" aria-disabled="true" disabled>Previous</button></li>
    <li><button type="button" aria-current="page">1</button></li>
    <li><button type="button">2</button></li>
    <li><button type="button">3</button></li>
    <li><button type="button" aria-label="Go to next page">Next</button></li>
  </ul>`;

async function mount(trail: string): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Pagination, { slots: { default: trail } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // Pagination is a pure static: no bindPagination exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['first page, previous disabled', FIRST_PAGE],
  ['middle page, both boundaries live', MIDDLE_PAGE],
  ['last page, next disabled', LAST_PAGE],
  ['button-style trail', BUTTONS],
];

for (const [name, trail] of scenes) {
  test(`pagination.astro ${name}`, async ({ task }) => {
    const document = await mount(trail);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
