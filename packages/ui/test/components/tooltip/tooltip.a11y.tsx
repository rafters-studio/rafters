import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../src/components/tooltip/tooltip';

interface SceneProps {
  open?: boolean;
  defaultOpen?: boolean;
  disableHoverableContent?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * The tip is NOT portalled: trigger and content are DOM siblings inside the
 * root, present at all times (#2148), so the whole scene lives in `container`
 * in both the closed and the open state. A tooltip root is not a landmark;
 * the page around it supplies the region.
 */
function Scene({ disableHoverableContent = false, ...props }: SceneProps) {
  return (
    <main>
      <TooltipProvider disableHoverableContent={disableHoverableContent}>
        <Tooltip {...props}>
          <TooltipTrigger>Help</TooltipTrigger>
          <TooltipContent>More info</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open by default', { defaultOpen: true }],
  ['controlled open', { open: true }],
  ['controlled closed', { open: false }],
  ['open on the left side', { defaultOpen: true, side: 'left' }],
  ['hoverable content disabled', { defaultOpen: true, disableHoverableContent: true }],
];

for (const [name, props] of scenes) {
  test(`tooltip ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
