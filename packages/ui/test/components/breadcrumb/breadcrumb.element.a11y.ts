import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/breadcrumb/breadcrumb.element';

const SIMPLE_TRAIL = `
  <ol class="flex flex-wrap items-center gap-1.5">
    <li class="inline-flex items-center gap-1.5"><a href="/">Home</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5"><a href="/products">Products</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5">
      <span role="link" aria-disabled="true" aria-current="page">Widget</span>
    </li>
  </ol>
`;

const TRUNCATED_TRAIL = `
  <ol class="flex flex-wrap items-center gap-1.5">
    <li class="inline-flex items-center gap-1.5"><a href="/">Home</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5">
      <span role="presentation" aria-hidden="true" class="flex h-9 w-9 items-center justify-center">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1"></circle></svg>
        <span class="sr-only">More</span>
      </span>
    </li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5">
      <span role="link" aria-disabled="true" aria-current="page">Widget</span>
    </li>
  </ol>
`;

const CURRENT_PAGE_ONLY = `
  <ol class="flex flex-wrap items-center gap-1.5">
    <li class="inline-flex items-center gap-1.5">
      <span role="link" aria-disabled="true" aria-current="page">Home</span>
    </li>
  </ol>
`;

function mount(slot: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-breadcrumb>${slot}</rafters-breadcrumb></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['simple trail', SIMPLE_TRAIL],
  ['truncated trail with an ellipsis', TRUNCATED_TRAIL],
  ['current page only', CURRENT_PAGE_ONLY],
];

for (const [name, slot] of scenes) {
  test(`rafters-breadcrumb ${name}`, async ({ task }) => {
    const host = mount(slot);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
