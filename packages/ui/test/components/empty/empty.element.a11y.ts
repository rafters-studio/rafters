import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/empty/empty.element';

const ICON =
  '<svg slot="icon" aria-hidden="true" viewBox="0 0 24 24"><title>search</title><circle cx="11" cy="11" r="8"></circle></svg>';

function mount(slots: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-empty>${slots}</rafters-empty></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  [
    'full family with an action',
    `${ICON}<h3 slot="title">No results found</h3><p slot="description">Try adjusting your search terms or filters.</p><button slot="action" type="button">Clear filters</button>`,
  ],
  [
    'informational without an action',
    `${ICON}<h3 slot="title">All caught up</h3><p slot="description">No new notifications.</p>`,
  ],
  [
    'title and description',
    '<h3 slot="title">No projects yet</h3><p slot="description">Create your first project to get started.</p>',
  ],
  ['title at heading level two', '<h2 slot="title">Level two</h2>'],
  ['plain text', 'nothing here'],
  ['no slotted content', ''],
];

for (const [name, slots] of scenes) {
  test(`rafters-empty ${name}`, async ({ task }) => {
    const host = mount(slots);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
