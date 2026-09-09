import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../../../src/components/dialog/dialog';

interface SceneProps {
  defaultOpen?: boolean;
  modal?: boolean;
  withDescription?: boolean;
  /** Explicit Portal + Overlay composition instead of the automatic wrappers. */
  composed?: boolean;
}

function Scene({ withDescription = true, composed = false, ...props }: SceneProps) {
  if (composed) {
    return (
      <Dialog {...props}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Composed</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }
  return (
    <Dialog {...props}>
      <DialogTrigger>Open settings</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          {withDescription ? <DialogDescription>Adjust your preferences.</DialogDescription> : null}
        </DialogHeader>
        <button type="button">Save</button>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['open without description', { defaultOpen: true, withDescription: false }],
  ['open non-modal', { defaultOpen: true, modal: false }],
  ['open explicit portal and overlay', { defaultOpen: true, composed: true }],
];

for (const [name, props] of scenes) {
  test(`dialog ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    // The content portals into document.body, outside the render container,
    // so an open scene audits the body; closed, only the trigger renders.
    const host = props.defaultOpen ? document.body : container;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
