import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Carousel from '../../../src/components/carousel/carousel.astro';
import { bindCarousel } from '../../../src/components/carousel/carousel.behavior';

const slides = ['Slide one', 'Slide two', 'Slide three'];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Carousel, {
    props: { id: 'gallery', slides, indicators: true, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindCarousel(document.querySelector('div[data-part="root"][data-carousel]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['first slide, horizontal', {}],
  ['vertical', { orientation: 'vertical' }],
  ['loop', { loop: true }],
  ['custom label', { label: 'Product gallery' }],
  ['without indicators', { indicators: false }],
  ['single slide', { slides: ['Only slide'] }],
];

for (const [name, props] of scenes) {
  test(`carousel.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
