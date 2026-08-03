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
    it('releases synchronously instead of waiting on an animationend that never fires', () => {
      // Under motion-reduce the animation resolves to none, so no animation is
      // created and no event is coming. Presence must not enter the wait at all.
      vi.useFakeTimers();
      const { rerender, queryByTestId, getByTestId } = render(<Overlay open />);
      computedStyle({ animationName: 'none', animationDuration: '0s' });

      rerender(<Overlay open={false} />);
      // No timer advance, no event dispatched -- already gone.
      expect(queryByTestId('node')).toBeNull();
      expect(getByTestId('gone')).toBeDefined();
    });

    it('treats a zeroed duration the same as no animation', () => {
      const { rerender, queryByTestId } = render(<Overlay open />);
      computedStyle({ animationName: 'scale-out', animationDuration: '0ms' });

      rerender(<Overlay open={false} />);
      expect(queryByTestId('node')).toBeNull();
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
