import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  type DrawerProps,
} from '../../../src/components/drawer/drawer';

interface SceneProps extends Partial<Omit<DrawerProps, 'children'>> {
  withDescription?: boolean;
  /** Explicit Portal + Overlay composition instead of the automatic wrappers. */
  composed?: boolean;
}

function Scene({ withDescription = true, composed = false, ...props }: SceneProps) {
  if (composed) {
    return (
      <Drawer {...props}>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Composed</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    );
  }
  return (
    <Drawer {...props}>
      <DrawerTrigger>Open actions</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Actions</DrawerTitle>
          {withDescription ? <DrawerDescription>Pick an action.</DrawerDescription> : null}
        </DrawerHeader>
        <button type="button">Save</button>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open from the bottom', { defaultOpen: true }],
  ['open from the right', { defaultOpen: true, side: 'right' }],
  ['open without description', { defaultOpen: true, withDescription: false }],
  ['open non-modal', { defaultOpen: true, modal: false }],
  ['open explicit portal and overlay', { defaultOpen: true, composed: true }],
];

for (const [name, props] of scenes) {
  test(`drawer ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    // The content portals into document.body, outside the render container,
    // so an open scene audits the body; closed, only the trigger renders.
    const host = props.defaultOpen ? document.body : container;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
