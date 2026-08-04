import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from '../../src/hooks/use-presence';

function Overlay({ open, animated }: { open: boolean; animated?: boolean }) {
  const { present, ref, state } = usePresence(open);
  if (!present) return <span data-testid="gone" />;
  return (
    <div
      ref={ref}
      data-testid="node"
      data-state={state}
      style={animated ? { transition: 'opacity 200ms', transitionProperty: 'opacity' } : undefined}
    />
  );
}

/** Pin what the exiting node's computed style says, the way a real sheet would. */
function computedStyle(style: Record<string, string>) {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    animationName: 'none',
    animationDuration: '0s',
    animationDelay: '0s',
    transitionProperty: 'none',
    transitionDuration: '0s',
    transitionDelay: '0s',
    ...style,
  } as unknown as CSSStyleDeclaration);
}

/** A running 200ms exit keyframe -- the shape the presence contract assumes. */
const RUNNING_EXIT_KEYFRAME = {
  animationName: 'scale-out',
  animationDuration: '0.2s',
  animationDelay: '0s',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('usePresence', () => {
  it('present and open while open', () => {
    const { getByTestId } = render(<Overlay open />);
    expect(getByTestId('node').getAttribute('data-state')).toBe('open');
  });

  it('un-animated: closing unmounts immediately', () => {
    const { getByTestId, rerender } = render(<Overlay open />);
    rerender(<Overlay open={false} />);
    expect(getByTestId('gone')).toBeDefined();
  });

  it('animated: node stays present as data-state=closed until the transition ends', () => {
    const { getByTestId, rerender, queryByTestId } = render(<Overlay open animated />);
    const node = getByTestId('node');
    computedStyle({ transitionDuration: '0.2s', transitionProperty: 'opacity' });

    rerender(<Overlay open={false} animated />);
    // Still present, now closed -- the exit CSS is running.
    expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

    act(() => {
      node.dispatchEvent(new Event('transitionend'));
    });
    expect(queryByTestId('node')).toBeNull();
  });

  it('holds the unmount through an exit KEYFRAME, then releases on animationend', () => {
    // The enter/exit mechanism proper: keyframes, not transitions. The node must
    // still be in the DOM carrying data-state=closed while the keyframe runs --
    // that is what makes exit frames render at all.
    const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
    const node = getByTestId('node');
    computedStyle(RUNNING_EXIT_KEYFRAME);

    rerender(<Overlay open={false} />);
    expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

    act(() => {
      node.dispatchEvent(new Event('animationend'));
    });
    expect(queryByTestId('node')).toBeNull();
  });

  describe('the timeout fallback', () => {
    it('releases the node when the animation never reports an end', () => {
      // A replaced animation fires neither animationend nor animationcancel.
      // Without the backstop the node is wedged on screen forever.
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      computedStyle(RUNNING_EXIT_KEYFRAME);

      rerender(<Overlay open={false} />);
      expect(getByTestId('node')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('scales with the animation rather than firing on a fixed constant', () => {
      // A magic constant either truncates a slow intent's exit or pins a closed
      // overlay on screen under a fast one. The backstop is derived from the
      // node's own computed duration, so a 2s exit is still present at 1s.
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      computedStyle({
        animationName: 'scale-out',
        animationDuration: '2s',
        animationDelay: '0s',
      });

      rerender(<Overlay open={false} />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(getByTestId('node')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('counts the delay, not just the duration', () => {
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      computedStyle({
        animationName: 'scale-out',
        animationDuration: '200ms',
        animationDelay: '800ms',
      });

      rerender(<Overlay open={false} />);
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(getByTestId('node')).toBeDefined();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(queryByTestId('node')).toBeNull();
    });
  });

  describe('reduced motion', () => {
    it('releases synchronously when NOTHING is attached and no event is coming', () => {
      // `animation-name: none` with no transition either: nothing will ever
      // fire, so entering the wait would pin the node until the backstop. This
      // is the no-animation case, NOT the reduced-motion one -- see below.
      vi.useFakeTimers();
      const { rerender, queryByTestId, getByTestId } = render(<Overlay open />);
      computedStyle({ animationName: 'none', animationDuration: '0s' });

      rerender(<Overlay open={false} />);
      // No timer advance, no event dispatched -- already gone.
      expect(queryByTestId('node')).toBeNull();
      expect(getByTestId('gone')).toBeDefined();
    });

    it('a ZERO-DURATION exit still releases via animationend, not the backstop (#2017)', () => {
      // THE MECHANISM-B CONTRACT, and the reason B was chosen over
      // `motion-reduce:animate-none`. The generated cell utility zeroes
      // animation-duration under prefers-reduced-motion while leaving the
      // animation ATTACHED, so the exit completes instantly AND still fires
      // animationend -- which is what presence releases the unmount on.
      //
      // The failure this pins: presence used to treat runMs === 0 as "nothing
      // is coming" and release synchronously, which silently took the exit off
      // the event. Both halves are asserted -- the node is HELD until the event
      // arrives, and the backstop is not what let it go.
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const node = getByTestId('node');
      computedStyle({ animationName: 'scale-out', animationDuration: '0s' });

      rerender(<Overlay open={false} />);
      // Held: the wait was entered, the listener is attached.
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      act(() => {
        node.dispatchEvent(new AnimationEvent('animationend', { animationName: 'scale-out' }));
      });
      expect(queryByTestId('node'), 'the zero-duration exit never released').toBeNull();
    });

    it('the backstop is not the release path for a zero-duration exit', () => {
      // The negative half of the same claim, stated separately so it cannot be
      // satisfied by a timer that happens to be short. With no event dispatched
      // the node is STILL present after a tick -- the 50ms failsafe has not run
      // -- which proves the previous test's release came from animationend.
      vi.useFakeTimers();
      const { getByTestId, rerender } = render(<Overlay open />);
      computedStyle({ animationName: 'scale-out', animationDuration: '0s' });

      rerender(<Overlay open={false} />);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');
    });
  });

  describe('re-entrancy: rapid open/close/open does not wedge', () => {
    it('reopening mid-exit keeps the node present past the old exit window', () => {
      // The failure this guards: the previous close left a pending release --
      // a listener or the backstop timer -- which fires against a node that is
      // now legitimately open and yanks it out from under the user.
      vi.useFakeTimers();
      const { getByTestId, rerender } = render(<Overlay open />);
      const node = getByTestId('node');
      computedStyle(RUNNING_EXIT_KEYFRAME);

      rerender(<Overlay open={false} />);
      act(() => {
        vi.advanceTimersByTime(50); // mid-exit
      });
      rerender(<Overlay open />);
      expect(getByTestId('node').getAttribute('data-state')).toBe('open');

      // The old animation's own end event, arriving late, must not unmount it.
      act(() => {
        node.dispatchEvent(new Event('animationend'));
      });
      // Nor may the old backstop fire.
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('open');
    });

    it('ignores the dying ENTER animation and waits for the exit', () => {
      // Found in a real browser, invisible in jsdom until asserted here.
      // Closing while the enter keyframe is still running CANCELS it, and the
      // browser fires animationcancel on the same node. A handler that releases
      // on any animation event unmounts on the enter's death -- the exit never
      // paints a frame. The exit is identified by name, so the enter's event is
      // ignored.
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const node = getByTestId('node');
      computedStyle(RUNNING_EXIT_KEYFRAME);

      rerender(<Overlay open={false} />);

      act(() => {
        node.dispatchEvent(new AnimationEvent('animationcancel', { animationName: 'scale-in' }));
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      act(() => {
        node.dispatchEvent(new AnimationEvent('animationend', { animationName: 'scale-out' }));
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('matches any member of a multi-name animation-name list', () => {
      // `animation-name` is a comma-separated CSS LIST, and a node running two
      // exit keyframes at once computes to 'scale-out, fade-out'. Each keyframe
      // fires its own animationend carrying its own SINGLE name, so a filter
      // that compares the event against the raw computed string matches none of
      // them: the exit is released only by the backstop timer, a visible extra
      // beat on every close. The filter splits and trims.
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      const node = getByTestId('node');
      computedStyle({
        animationName: 'scale-out, fade-out',
        animationDuration: '0.2s, 0.15s',
        animationDelay: '0s, 0s',
      });

      rerender(<Overlay open={false} />);

      // A name in neither position is still rejected -- the filter got looser,
      // not absent, and the dying enter must still be ignored.
      act(() => {
        node.dispatchEvent(new AnimationEvent('animationcancel', { animationName: 'scale-in' }));
      });
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      // The SECOND member, the one only reachable by splitting, releases it --
      // and the trailing member is where the untrimmed leading space lives.
      act(() => {
        node.dispatchEvent(new AnimationEvent('animationend', { animationName: 'fade-out' }));
      });
      expect(queryByTestId('node')).toBeNull();
    });

    it('still unmounts after open -> close -> open -> close', () => {
      vi.useFakeTimers();
      const { getByTestId, rerender, queryByTestId } = render(<Overlay open />);
      computedStyle(RUNNING_EXIT_KEYFRAME);

      rerender(<Overlay open={false} />);
      rerender(<Overlay open />);
      rerender(<Overlay open={false} />);
      expect(getByTestId('node').getAttribute('data-state')).toBe('closed');

      act(() => {
        getByTestId('node').dispatchEvent(new Event('animationend'));
      });
      expect(queryByTestId('node')).toBeNull();
    });
  });
});
