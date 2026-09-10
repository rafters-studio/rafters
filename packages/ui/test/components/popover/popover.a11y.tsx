import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '../../../src/components/popover/popover';

interface SceneProps {
  defaultOpen?: boolean;
  withClose?: boolean;
  withAnchor?: boolean;
  forceMount?: boolean;
}

function Scene({
  defaultOpen = false,
  withClose = true,
  withAnchor = false,
  forceMount = false,
}: SceneProps) {
  return (
    <main>
      <Popover defaultOpen={defaultOpen}>
        {withAnchor ? (
          <PopoverAnchor>
            <span>Anchor here</span>
          </PopoverAnchor>
        ) : null}
        <PopoverTrigger>Open menu</PopoverTrigger>
        <PopoverContent aria-label="Menu options" forceMount={forceMount}>
          <button type="button">Action</button>
          {withClose ? <PopoverClose>Dismiss</PopoverClose> : null}
        </PopoverContent>
      </Popover>
    </main>
  );
}

// The content portals into document.body, outside the render container, so
// every scene audits document.body: the open panel would otherwise be missed.
const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['open without a close button', { defaultOpen: true, withClose: false }],
  ['open on an explicit anchor', { defaultOpen: true, withAnchor: true }],
  ['closed with forceMount content hidden', { forceMount: true }],
];

for (const [name, props] of scenes) {
  test(`popover ${name}`, async ({ task }) => {
    await render(<Scene {...props} />);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
