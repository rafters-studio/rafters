import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Embed from '../../../src/components/embed/embed.astro';

// The same URL the conformance tests resolve. The parsed window disables
// iframe page loading, as the astro project's own environment does, so the
// remote src is never fetched: axe audits the iframe element in this document.
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Embed, { props });
  const window = new Window({ settings: { disableIframePageLoading: true } });
  const document = window.document as unknown as Document;
  // An embed is a frame, not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // Embed is a pure static: no bindEmbed exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['titled iframe', { url: YOUTUBE, title: 'Intro video' }],
  ['default provider title', { url: YOUTUBE }],
  ['square aspect ratio', { url: YOUTUBE, title: 'Intro video', aspectRatio: '1:1' }],
  ['disallowed host fallback with a recovery link', { url: 'https://evil.com/watch?v=x' }],
  ['twitter fallback', { url: 'https://twitter.com/user/status/123' }],
];

for (const [name, props] of scenes) {
  test(`embed.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
