import * as React from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../src/components/alert-dialog/alert-dialog';

interface SceneProps {
  defaultOpen?: boolean;
  withDescription?: boolean;
  explicitPortal?: boolean;
  forceMount?: boolean;
}

/**
 * The content portals to document.body by default, which would put the open
 * dialog outside the audited container. The scene owns a portal target inside
 * the container so axe sees trigger, overlay, and dialog together.
 */
function Scene({
  defaultOpen = false,
  withDescription = true,
  explicitPortal = false,
  forceMount = false,
}: SceneProps) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const surface = (
    <AlertDialogContent forceMount={forceMount} container={target}>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        {withDescription ? (
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        ) : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
  return (
    <main>
      <AlertDialog defaultOpen={defaultOpen}>
        <AlertDialogTrigger>Delete account</AlertDialogTrigger>
        {target === null ? null : explicitPortal ? (
          <AlertDialogPortal container={target}>
            <AlertDialogOverlay />
            {surface}
          </AlertDialogPortal>
        ) : (
          surface
        )}
      </AlertDialog>
      <div ref={setTarget} />
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['open without a description', { defaultOpen: true, withDescription: false }],
  ['open with explicit portal and overlay', { defaultOpen: true, explicitPortal: true }],
  ['closed with the content force-mounted', { forceMount: true }],
];

for (const [name, props] of scenes) {
  test(`alert-dialog ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
