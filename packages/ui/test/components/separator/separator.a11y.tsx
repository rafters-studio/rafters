import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Separator } from '../../../src/components/separator/separator';
import type { SeparatorOrientation } from '../../../src/components/separator/separator.behavior';

interface SceneProps {
  orientation?: SeparatorOrientation;
  decorative?: boolean;
}

function Scene(props: SceneProps) {
  return (
    <main>
      <p>Above</p>
      <Separator {...props} />
      <p>Below</p>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['decorative horizontal', {}],
  ['decorative vertical', { orientation: 'vertical' }],
  ['semantic horizontal', { decorative: false }],
  ['semantic vertical', { decorative: false, orientation: 'vertical' }],
];

for (const [name, props] of scenes) {
  test(`separator ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
