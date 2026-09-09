import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/embed/embed.element';

// The same URL the conformance tests resolve; the resolver rewrites it to the
// nocookie embed host, so every iframe path is a remote origin by design. axe
// pings the frame, gets no answer (axe is not injected there), and after its
// ping timeout audits the iframe element itself from this document.
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function mount(attrs: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-embed ${attrs}></rafters-embed></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['titled iframe', `url="${YOUTUBE}" title="Intro video"`],
  ['default provider title', `url="${YOUTUBE}"`],
  ['nine by sixteen aspect ratio', `url="${YOUTUBE}" title="Intro video" aspect-ratio="9:16"`],
  ['missing url fallback without a link', ''],
  ['disallowed host fallback with a recovery link', 'url="https://evil.com/watch?v=x"'],
  ['twitter fallback', 'url="https://twitter.com/user/status/123"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-embed ${name}`, async ({ task }) => {
    const host = mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
