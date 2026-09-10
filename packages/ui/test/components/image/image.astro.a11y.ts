import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Image from '../../../src/components/image/image.astro';
import { bindImage } from '../../../src/components/image/image.behavior';

/** A 1x1 transparent GIF: no network, no layout surprises. */
const SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Image, { props: { src: SRC, ...props } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindImage(document.querySelector('[data-part="root"][data-image]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['loaded', { alt: 'A sunset over the ocean' }],
  ['loading', { alt: 'Loading photo', status: 'loading' }],
  ['error', { alt: 'Broken', status: 'error' }],
  ['error with custom message', { alt: 'Broken', status: 'error', errorMessage: 'Gone' }],
  ['loading with custom label', { alt: 'Photo', status: 'loading', loadingLabel: 'Wait' }],
  ['with caption', { alt: 'Photo', caption: 'Photo by John Doe' }],
  ['sized, left aligned, rounded', { alt: 'Photo', size: 'md', alignment: 'left', radius: '2xl' }],
  ['decorative empty alt', { alt: '' }],
];

for (const [name, props] of scenes) {
  test(`image.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
