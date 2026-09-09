import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { AspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

interface Scene {
  ratio?: number;
  child: 'photo' | 'decorative' | 'text';
}

function content(child: Scene['child']) {
  switch (child) {
    case 'photo':
      return <img src={PIXEL} alt="A descriptive alt" />;
    case 'decorative':
      return <img src={PIXEL} alt="" />;
    case 'text':
      return <div>Video placeholder</div>;
  }
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default square with a photo', { child: 'photo' }],
  ['16/9 with a photo', { ratio: 16 / 9, child: 'photo' }],
  ['4/3 with a photo', { ratio: 4 / 3, child: 'photo' }],
  ['square with a decorative image', { ratio: 1, child: 'decorative' }],
  ['16/9 with text content', { ratio: 16 / 9, child: 'text' }],
];

for (const [name, { ratio, child }] of scenes) {
  test(`aspect-ratio ${name}`, async ({ task }) => {
    // An absent ratio must stay absent: the default-square scene exercises it.
    const props = ratio === undefined ? {} : { ratio };
    const { container } = await render(<AspectRatio {...props}>{content(child)}</AspectRatio>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
