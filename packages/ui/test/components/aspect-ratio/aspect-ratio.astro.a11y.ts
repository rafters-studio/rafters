import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import AspectRatio from '../../../src/components/aspect-ratio/aspect-ratio.astro';

const PHOTO = '<img src="/photo.jpg" alt="A descriptive alt" />';
const DECORATIVE = '<img src="/photo.jpg" alt="" />';
const TEXT = '<div>Video placeholder</div>';

async function mount(props: Record<string, unknown>, slot: string): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(AspectRatio, { props, slots: { default: slot } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // AspectRatio is a pure static: no bindAspectRatio exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, string]> = [
  ['default square with a photo', {}, PHOTO],
  ['16/9 with a photo', { ratio: 16 / 9 }, PHOTO],
  ['4/3 with a photo', { ratio: 4 / 3 }, PHOTO],
  ['square with a decorative image', { ratio: 1 }, DECORATIVE],
  ['16/9 with text content', { ratio: 16 / 9 }, TEXT],
];

for (const [name, props, slot] of scenes) {
  test(`aspect-ratio.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slot);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
