import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ScrollArea from '../../../src/components/scroll-area/scroll-area.astro';

async function mount(props: Record<string, unknown>, content: string): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ScrollArea, { props, slots: { default: content } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // ScrollArea is a pure static: no bindScrollArea exists, so nothing to hydrate.
  return document;
}

const LIST = '<ul><li>One</li><li>Two</li><li>Three</li></ul>';

const scenes: ReadonlyArray<[string, Record<string, unknown>, string]> = [
  ['vertical', {}, '<p>Body</p>'],
  ['horizontal', { orientation: 'horizontal' }, '<p>Body</p>'],
  ['both', { orientation: 'both' }, '<p>Body</p>'],
  ['with list content', {}, LIST],
];

for (const [name, props, content] of scenes) {
  test(`scroll-area.astro ${name}`, async ({ task }) => {
    const document = await mount(props, content);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
