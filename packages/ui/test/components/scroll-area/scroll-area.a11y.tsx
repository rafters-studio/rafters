import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { ScrollArea, ScrollBar } from '../../../src/components/scroll-area/scroll-area';
import type { ScrollAreaOrientation } from '../../../src/components/scroll-area/scroll-area.behavior';

interface SceneProps {
  orientation?: ScrollAreaOrientation;
  withScrollBar?: boolean;
}

function Scene({ withScrollBar, ...props }: SceneProps) {
  return (
    <main>
      <ScrollArea className="h-40" {...props}>
        <ul>
          <li>One</li>
          <li>Two</li>
          <li>Three</li>
        </ul>
        {withScrollBar ? <ScrollBar orientation="horizontal" /> : null}
      </ScrollArea>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['vertical', {}],
  ['horizontal', { orientation: 'horizontal' }],
  ['both', { orientation: 'both' }],
  ['with decorative scrollbar', { withScrollBar: true }],
];

for (const [name, props] of scenes) {
  test(`scroll-area ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
