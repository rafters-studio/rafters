/**
 * usePresence, the jsdom half (#2157).
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE. The hook now OBSERVES animations
 * (`getAnimations()`, `Animation.finished`) instead of measuring durations and
 * timing them, and the test DOM has no Web Animations API whatsoever -- no
 * `Element.prototype.getAnimations`, no `Animation` constructor, no timeline.
 * So every case here that involves a running exit installs a FAKE
 * `getAnimations` on the node returning promises this file settles by hand. That
 * is enough to pin the wiring -- held until settled, released once, never
 * released against a reopened node -- and it is NOT enough to pin the browser
 * semantics underneath it: whether a cancelled enter is still returned, whether
 * `getAnimations()` flushes the pending exit rule into view, whether a
 * zero-duration animation really settles. Those live in
 * `test/presence/presence-race.e2e.ts`, in three real engines.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePresence } from '../../src/hooks/use-presence';

function Overlay({ open }: { open: boolean }) {
  const { present, ref, state } = usePresence(open);
  if (!present) return <span data-testid="gone" />;
  return <div ref={ref} data-testid="node" data-state={state} />;
}

/** One pending animation, plus the handles this file settles it with. */
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
 * Give the node a Web Animations surface the hook can read. `count: 0` is the
 * "nothing is attached" shape -- a transition declared on a property that never
 * changed, which creates no animation object at all.
 */
function attachAnimations(node: HTMLElement, count: number): FakeAnimation[] {
  const fakes = Array.from({ length: count }, () => fakeAnimation());
  Object.defineProperty(node, 'getAnimations', {
    configurable: true,
    value: () => fakes.map((fake) => fake.animation),
  });
  return fakes;
}

/** Let the hook's `await Promise.allSettled(...)` chain run to completion. */
async function settleMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
});

describe('usePresence', () => {
  it('present and open while open', () => {
    const { getByTestId } = render(<Overlay open />);
    expect(getByTestId('node').getAttribute('data-state')).toBe('open');
  });

  it('starts absent when it starts closed', () => {
    const { getByTestId, queryByTestId } = render(<Overlay open={false} />);
    expect(queryByTestId('node')).toBeNull();
    expect(getByTestId('gone')).toBeDefined();
  });

  describe('nothing attached', () => {
    it('releases synchronously when no animation or transition is attached', () => {
      // `getAnimations()` comes back empty: a transition on a property that
      // never changes creates no CSSTransition, and there is no keyframe either.
      // Nothing will ever settle, so waiting would wedge the node forever.
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      attachAnimations(getByTestId('node'), 0);

      rerender(<Overlay open={false} />);
      // No promise flushed, no timer advanced -- already gone in the same tick.
      expect(queryByTestId('node')).toBeNull();
      expect(getByTestId('gone')).toBeDefined();
    });

    it('releases when the DOM has no Web Animations API at all', () => {
      // The environment guard. happy-dom defines no `getAnimations`, so this is
      // the default path for every consumer suite in this package, and it must
      // behave like the empty-list case rather than throwing.
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      expect(
        'getAnimations' in getByTestId('node'),
        'the test DOM grew an animation timeline -- this case no longer covers the shim path',
      ).toBe(false);

      rerender(<Overlay open={false} />);
      expect(queryByTestId('node')).toBeNull();
    });
  });

  describe('an attached exit', () => {
    it('holds the unmount until the exit animation settles', async () => {
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const exit = attachAnimations(getByTestId('node'), 1)[0];
      if (exit === undefined) throw new Error('no fake animation');

      rerender(<Overlay open={false} />);
      // Still present, now closed -- the exit keyframe is running, and the node
      // has to be attached for its frames to paint at all.
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      // A flush with nothing settled must NOT release it: this is the half that
      // fails if the hook ever bails out early instead of awaiting.
      await settleMicrotasks();
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      await act(async () => {
        exit.finish();
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('waits for EVERY animation, not just the first to settle', async () => {
      // `animation-name` is a comma-separated list and a node may legitimately
      // run several exit keyframes at once (`scale-out, fade-out`). Releasing on
      // the first truncates the rest.
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const [first, second] = attachAnimations(getByTestId('node'), 2);
      if (first === undefined || second === undefined) throw new Error('no fake animations');

      rerender(<Overlay open={false} />);

      await act(async () => {
        first.finish();
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      await act(async () => {
        second.finish();
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('a cancelled animation still settles the wait rather than wedging it', async () => {
      // `Animation.finished` REJECTS on cancellation. `Promise.allSettled`
      // absorbs that -- which is the entire reason it is used here instead of
      // `Promise.all`, where one rejection would resolve the wait early and, on
      // an interrupted enter, unmount before the exit's first frame.
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const exit = attachAnimations(getByTestId('node'), 1)[0];
      if (exit === undefined) throw new Error('no fake animation');

      rerender(<Overlay open={false} />);
      await act(async () => {
        exit.cancel();
      });
      expect(queryByTestId('node')).toBeNull();
    });
  });

  describe('an animation that has not settled yet', () => {
    it('is waited on rather than bailed past, however briefly it will run', async () => {
      // THE OLD `runMs === 0` DEFECT, restated for the new mechanism. Presence
      // used to read a duration and treat zero as "nothing is coming", which
      // silently took the exit off the animation and onto whatever ran first --
      // the bug #2017 fixed. Duration is not consulted at all any more, so the
      // rule is simply: an animation that is in the list has not settled, and a
      // node whose animation has not settled stays. Both halves are asserted --
      // the node is HELD before the animation settles, and it goes once it does.
      //
      // What this is NOT is the reduced-motion case. A real zero-duration
      // animation never reaches `getAnimations()` at all, because it finishes
      // inside the style flush that creates it; `test/presence/presence-race.e2e.ts`
      // measures that in all three engines, with and without React. Under
      // reduced motion presence therefore takes the empty-list path above, which
      // is why nothing here can be reached by zeroing a duration.
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const exit = attachAnimations(getByTestId('node'), 1)[0];
      if (exit === undefined) throw new Error('no fake animation');

      rerender(<Overlay open={false} />);
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      await settleMicrotasks();
      expect(
        getByTestId('node').getAttribute('data-state'),
        'presence bailed out instead of waiting for the animation it was handed',
      ).toBe('closed');

      await act(async () => {
        exit.finish();
      });
      expect(queryByTestId('node')).toBeNull();
    });
  });

  describe('re-entrancy: rapid open/close/open does not wedge', () => {
    it('reopening mid-exit survives the old exit settling late', async () => {
      // The failure this guards: the previous close left a pending release,
      // which lands on a node that is now legitimately open and yanks it out
      // from under the user.
      const { getByTestId, rerender } = render(<Overlay open />);
      const exit = attachAnimations(getByTestId('node'), 1)[0];
      if (exit === undefined) throw new Error('no fake animation');

      rerender(<Overlay open={false} />);
      rerender(<Overlay open />);
      expect(getByTestId('node').getAttribute('data-state')).toBe('open');

      await act(async () => {
        exit.finish();
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('open');
    });

    it('still unmounts after open -> close -> open -> close', async () => {
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const first = attachAnimations(getByTestId('node'), 1)[0];
      if (first === undefined) throw new Error('no fake animation');

      rerender(<Overlay open={false} />);
      rerender(<Overlay open />);
      // The reopen replaces the exit with a fresh enter; the next close observes
      // whatever is on the node THEN, not the animation the first close saw.
      const second = attachAnimations(getByTestId('node'), 1)[0];
      if (second === undefined) throw new Error('no fake animation');
      rerender(<Overlay open={false} />);
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      // The stale one must not release it...
      await act(async () => {
        first.finish();
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      // ...and the live one must.
      await act(async () => {
        second.finish();
      });
      expect(queryByTestId('node')).toBeNull();
    });
  });

  describe('the mechanism itself', () => {
    // #2157 deleted the measure-and-time machinery outright. These are the two
    // acceptance criteria that are about the SOURCE rather than an observable:
    // a reintroduced `setTimeout` would pass every behavioural case above while
    // putting a second clock back alongside the browser's.
    // `node:path`, not `new URL(...)`: the global `URL` in this environment is
    // happy-dom's, and `node:fs` does not accept one of those as a path.
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../src/hooks/use-presence.ts'), 'utf8');
    const code = source.slice(source.indexOf('import * as React'));

    it.each(['timeMs', 'longestRun', 'ExitMeasurement', 'measureExit', 'fallbackMs'])(
      'no longer defines %s',
      (name) => {
        expect(code.includes(name)).toBe(false);
      },
    );

    it('measures nothing and times nothing', () => {
      expect(code.includes('getComputedStyle'), 'presence is measuring durations again').toBe(
        false,
      );
      expect(code.includes('setTimeout'), 'presence is timing the exit again').toBe(false);
    });
  });
});
