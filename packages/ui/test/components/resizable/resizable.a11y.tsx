import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../../src/components/resizable/resizable';
import type { ResizableDirection } from '../../../src/components/resizable/resizable.behavior';

interface ScenePanel {
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

interface SceneProps {
  direction?: ResizableDirection;
  panels: ScenePanel[];
  disabled?: boolean;
  withHandle?: boolean;
}

/** A separator has no intrinsic text, so every handle carries an accessible name. */
function Scene({
  direction = 'horizontal',
  panels,
  disabled = false,
  withHandle = false,
}: SceneProps) {
  const children: React.ReactNode[] = [];
  for (const [index, panel] of panels.entries()) {
    children.push(
      <ResizablePanel
        key={`panel-${index}`}
        defaultSize={panel.defaultSize}
        minSize={panel.minSize ?? 0}
        maxSize={panel.maxSize ?? 100}
      >
        <p>Panel {index + 1}</p>
      </ResizablePanel>,
    );
    if (index < panels.length - 1) {
      children.push(
        <ResizableHandle
          key={`handle-${index}`}
          withHandle={withHandle}
          aria-label="Resize section"
        />,
      );
    }
  }
  return (
    <ResizablePanelGroup direction={direction} disabled={disabled}>
      {children}
    </ResizablePanelGroup>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['two panels horizontal', { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }],
  [
    'three panels with a grip',
    { withHandle: true, panels: [{ defaultSize: 25 }, { defaultSize: 50 }, { defaultSize: 25 }] },
  ],
  ['vertical split', { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] }],
  [
    'bounded panels',
    {
      panels: [
        { defaultSize: 30, minSize: 20, maxSize: 60 },
        { defaultSize: 70, minSize: 40, maxSize: 80 },
      ],
    },
  ],
  ['disabled', { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }],
];

for (const [name, props] of scenes) {
  test(`resizable ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
