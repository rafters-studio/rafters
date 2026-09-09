import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../src/components/sheet/sheet';
import type { SheetSide } from '../../../src/components/sheet/sheet.behavior';

interface SceneProps {
  defaultOpen?: boolean;
  modal?: boolean;
  side?: SheetSide;
  withDescription?: boolean;
  forceMount?: boolean;
}

function Scene({ withDescription = true, side, forceMount, ...props }: SceneProps) {
  return (
    <main>
      <Sheet {...props}>
        <SheetTrigger>Open filters</SheetTrigger>
        <SheetContent {...(side ? { side } : {})} {...(forceMount ? { forceMount: true } : {})}>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            {withDescription ? <SheetDescription>Refine the results.</SheetDescription> : null}
          </SheetHeader>
          <button type="button">Apply</button>
          <SheetFooter />
        </SheetContent>
      </Sheet>
    </main>
  );
}

// The open content portals to document.body, outside the render container,
// so open scenes (and forceMount, whose hidden content is portalled too) run
// axe on document.body; the closed trigger-only scene runs on the container.
const scenes: ReadonlyArray<[string, SceneProps, 'container' | 'body']> = [
  ['closed', {}, 'container'],
  ['open', { defaultOpen: true }, 'body'],
  ['open without description', { defaultOpen: true, withDescription: false }, 'body'],
  ['open on the left', { defaultOpen: true, side: 'left' }, 'body'],
  ['open on the top', { defaultOpen: true, side: 'top' }, 'body'],
  ['open on the bottom', { defaultOpen: true, side: 'bottom' }, 'body'],
  ['non-modal open', { defaultOpen: true, modal: false }, 'body'],
  ['forceMount closed', { forceMount: true }, 'body'],
];

for (const [name, props, host] of scenes) {
  test(`sheet ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(host === 'body' ? document.body : container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
