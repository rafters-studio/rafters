import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Image, type ImageProps } from '../../../src/components/image/image';

/** A 1x1 transparent GIF: no network, no layout surprises. */
const SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const scenes: ReadonlyArray<[string, ImageProps]> = [
  ['loaded', { src: SRC, alt: 'A sunset over the ocean' }],
  ['loading', { src: SRC, alt: 'Loading photo', status: 'loading' }],
  ['error', { src: SRC, alt: 'Broken', status: 'error' }],
  [
    'error with custom message',
    { src: SRC, alt: 'Broken', status: 'error', errorMessage: 'Unavailable' },
  ],
  [
    'loading with custom label',
    { src: SRC, alt: 'Photo', status: 'loading', loadingLabel: 'Wait' },
  ],
  ['with caption', { src: SRC, alt: 'Photo', caption: 'Photo by John Doe' }],
  [
    'sized, left aligned, rounded',
    { src: SRC, alt: 'Photo', size: 'md', alignment: 'left', radius: '2xl' },
  ],
  ['decorative empty alt', { src: SRC, alt: '' }],
];

for (const [name, props] of scenes) {
  test(`image ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Image {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
