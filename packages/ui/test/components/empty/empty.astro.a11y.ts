import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Empty from '../../../src/components/empty/empty.astro';

const ICON =
  '<svg aria-hidden="true" viewBox="0 0 24 24"><title>search</title><circle cx="11" cy="11" r="8"></circle></svg>';

async function mount(slots: Record<string, string>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Empty, { props: {}, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A placeholder is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // Empty is a pure static: no bindEmpty exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, string>]> = [
  [
    'full family with an action',
    {
      icon: ICON,
      title: '<h3>No results found</h3>',
      description: 'Try adjusting your search terms or filters.',
      action: '<button type="button">Clear filters</button>',
    },
  ],
  [
    'informational without an action',
    { icon: ICON, title: '<h3>All caught up</h3>', description: 'No new notifications.' },
  ],
  [
    'title and description',
    { title: '<h3>No projects yet</h3>', description: 'Create your first project to get started.' },
  ],
  ['title at heading level two', { title: '<h2>Level two</h2>' }],
  ['plain text', { default: 'nothing here' }],
  ['no slotted content', {}],
];

for (const [name, slots] of scenes) {
  test(`empty.astro ${name}`, async ({ task }) => {
    const document = await mount(slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
