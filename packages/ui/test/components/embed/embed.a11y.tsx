import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Embed } from '../../../src/components/embed/embed';

// The same URL the conformance tests resolve; the resolver rewrites it to the
// nocookie embed host, so every iframe path is a remote origin by design. axe
// pings the frame, gets no answer (axe is not injected there), and after its
// ping timeout audits the iframe element itself from this document: the
// frame-title rule still runs on the element the component rendered.
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ['titled iframe', () => <Embed url={YOUTUBE} title="Intro video" />],
  ['default provider title', () => <Embed url={YOUTUBE} />],
  [
    'four by three aspect ratio',
    () => <Embed url={YOUTUBE} title="Intro video" aspectRatio="4:3" />,
  ],
  [
    'disallowed host fallback with a recovery link',
    () => <Embed url="https://evil.com/watch?v=x" />,
  ],
  ['twitter fallback', () => <Embed url="https://twitter.com/user/status/123" />],
];

for (const [name, build] of scenes) {
  test(`embed ${name}`, async ({ task }) => {
    const { container } = await render(build());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
