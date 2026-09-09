import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Separator from '../../../src/components/separator/separator.astro';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Separator, { props });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main><p>Above</p>${html}<p>Below</p></main>`;
  // Separator is a static score: no bindSeparator exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['decorative horizontal', {}],
  ['decorative vertical', { orientation: 'vertical' }],
  ['semantic horizontal', { decorative: false }],
  ['semantic vertical', { decorative: false, orientation: 'vertical' }],
];

for (const [name, props] of scenes) {
  test(`separator.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
