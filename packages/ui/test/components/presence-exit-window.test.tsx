/**
 * THE EXIT WINDOW STAYS MOUNTED, AND THE OVERLAY STAYS PAINTABLE IN IT.
 *
 * Every overlay component holds its content past `open === false` so the exit
 * animation has frames to run in. `usePresence` is that hold. But the hold was
 * computed INSIDE the content, and the portal -- the content's own ancestor --
 * gated on the raw open flag, so the portal unmounted on the tick the flag
 * flipped and took the content with it. The exit had never rendered a frame in
 * the portal case, which is the default.
 *
 * Nothing caught it because nothing looked at the window between "closed" and
 * "gone". Every test asserted the open state or the closed state, and the exit
 * lives strictly between them.
 *
 * These tests stand in that window. They drive the real components, close them,
 * and assert the parts are still in the document while the animation would be
 * running -- with the overlay NOT `hidden`, since `hidden` is `display: none`
 * and blocks animation outright, which would make a mounted overlay just as
 * frameless as an unmounted one.
 *
 * happy-dom runs no animations, so `getAnimations()` returns nothing and
 * presence releases immediately. That is exactly the case this can test: it
 * pins the STRUCTURE -- who gates on the held value rather than the raw flag --
 * not the timing, which belongs to the Playwright specs under test/presence/.
 * A component that regresses to gating a portal on `open` fails here.
 *
 * THE FIRST VERSION OF THIS FILE COULD NOT FAIL, and that is worth recording.
 * It asserted the same structure against a DOM with no Web Animations API, so
 * `present` collapsed onto the open flag and both gates behaved identically --
 * it passed with the defect deliberately reinstated. A test that reports a bug
 * fixed is worse than no test. The fix is the harness below: attach a pending
 * animation to the content node and the hold becomes real, so a portal on the
 * raw flag unmounts while the content is still held, and the two disagree.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from '../../src/components/alert-dialog/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '../../src/components/dialog/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from '../../src/components/drawer/drawer';
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from '../../src/components/sheet/sheet';

/**
 * Inlined per the no-shared-test-support-module rule (#2329): a
 * hand-settled Web Animations surface for the presence suites (#2157).
 *
 * `usePresence` OBSERVES animations: it calls `getAnimations()` on the node
 * and awaits the returned animations' `finished` promises. The test DOM has
 * no Web Animations API at all -- no `Element.prototype.getAnimations`, no
 * `Animation`, no timeline -- so a suite that wants to exercise the wait has
 * to install the animation itself and settle it by hand.
 *
 * What this pins is the WIRING -- held until settled, released once, never
 * released against a reopened node. It cannot pin the browser semantics
 * underneath; those live in test/presence/presence-race.spec.ts, in three
 * real engines.
 */

/** One pending animation, plus the handles a spec settles it with. */
interface FakeAnimation {
  animation: Animation;
  /** Complete it, the way a healthy exit ends. */
  finish: () => void;
  /** Reject it, the way a cancelled or replaced animation ends. */
  cancel: () => void;
}

function fakeAnimation(): FakeAnimation {
  let finish = (): void => {};
  let cancel = (): void => {};
  const finished = new Promise<Animation>((resolve, reject) => {
    finish = () => resolve(animation);
    cancel = () => reject(new Error('cancelled'));
  });
  const animation = { finished } as unknown as Animation;
  return { animation, finish, cancel };
}

/**
 * Give the node a Web Animations surface the hook can read. `count: 0` is
 * the "nothing is attached" shape -- a transition declared on a property
 * that never changed, which creates no animation object at all.
 */
function attachAnimations(node: HTMLElement, count: number): FakeAnimation[] {
  const fakes = Array.from({ length: count }, () => fakeAnimation());
  Object.defineProperty(node, 'getAnimations', {
    configurable: true,
    value: () => fakes.map((fake) => fake.animation),
  });
  return fakes;
}

/**
 * The single-animation case, which is most of them. Returning the one fake
 * directly saves every caller the `[0]` plus its `undefined` guard.
 */
function attachAnimation(node: HTMLElement): FakeAnimation {
  const [fake] = attachAnimations(node, 1);
  if (fake === undefined) throw new Error('attachAnimation: no fake animation was created');
  return fake;
}

afterEach(cleanup);

const body = () => document.body;
const part = (name: string) => body().querySelector(`[data-part="${name}"]`);

/**
 * Each case renders an EXPLICIT portal + overlay, because that composition is
 * the one the defect lived in: the portal gate ran before the content's own.
 */
const CASES = [
  {
    name: 'dialog',
    render: (open: boolean) => (
      <Dialog open={open}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Settings</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    ),
  },
  {
    name: 'alert-dialog',
    render: (open: boolean) => (
      <AlertDialog open={open}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Delete</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    ),
  },
  {
    name: 'sheet',
    render: (open: boolean) => (
      <Sheet open={open}>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetTitle>Filters</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    ),
  },
  {
    name: 'drawer',
    render: (open: boolean) => (
      <Drawer open={open}>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Details</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    ),
  },
] as const;

describe.each(CASES)('$name: the exit window', ({ render: renderCase }) => {
  it('mounts the portal, overlay and content while open', () => {
    render(renderCase(true));
    expect(part('overlay'), 'overlay missing while open').not.toBeNull();
    expect(part('content'), 'content missing while open').not.toBeNull();
  });

  it('does not hide the overlay while it is open', () => {
    // `hidden` is display:none, which blocks animation outright -- an overlay
    // hidden during its own fade is as frameless as one that unmounted.
    render(renderCase(true));
    expect((part('overlay') as HTMLElement).hidden).toBe(false);
  });

  it('holds the whole subtree through the exit, then releases it', async () => {
    const { rerender } = render(renderCase(true));
    const content = part('content') as HTMLElement;
    expect(content, 'content missing while open').not.toBeNull();

    // A pending animation on the content node makes the exit window real: the
    // hook now has something to wait on. Without this the window is zero-width
    // and the gate under test is unobservable.
    const exit = attachAnimation(content);

    rerender(renderCase(false));

    // MID-EXIT. Everything is still mounted -- including the portal, whose gate
    // is the one that used to fire first and take the content with it.
    expect(part('content'), 'content unmounted before its exit finished').not.toBeNull();
    expect(part('overlay'), 'overlay unmounted before its exit finished').not.toBeNull();
    expect(
      (part('overlay') as HTMLElement).hidden,
      'overlay hidden mid-exit -- display:none blocks the fade it is meant to run',
    ).toBe(false);

    // Settled: the hold releases and the subtree goes.
    exit.finish();
    await Promise.resolve();
    await Promise.resolve();
    rerender(renderCase(false));

    expect(part('content'), 'content never released after the exit settled').toBeNull();
  });
});
