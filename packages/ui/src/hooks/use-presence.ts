/**
 * usePresence -- the presence mechanism (#1996).
 *
 * THE CONTRACT, ratified 2026-08-02:
 *   enter = the node arrives with a keyframe animation already attached, and
 *           runs it. An element that MOUNTS (or leaves `display: none`) with an
 *           animation needs no `@starting-style` -- that hack exists for
 *           TRANSITIONS on mount, and this system does not use it anywhere.
 *   exit  = the state flips to 'closed', the exit keyframe runs, and REMOVAL IS
 *           HELD by the behavior layer until the animation ends. Presence owns
 *           the unmount; CSS owns the movement.
 *
 * Callers render while `present` is true, put `state` on the animated node as
 * `data-state`, and attach `ref` to that same node. The node's own classes key
 * the enter/exit keyframes off `data-[state=open]` / `data-[state=closed]`.
 *
 * THE THREE WAYS THIS WEDGES, and what stops each:
 *   1. The animation is cancelled, or `animationend` never arrives at all (a
 *      transition declared on a property that never changes fires nothing).
 *      -> a timeout fallback, DERIVED from the node's own computed duration and
 *      delay, releases the unmount. Derived, not a constant: a magic 500ms
 *      would pin a closed dialog on screen under a slow intent and truncate a
 *      slower one.
 *   2. Reduced motion. The utilities resolve the movement to nothing, so no
 *      animation is created and no event will ever fire. -> the wait is never
 *      entered: with no running animation presence releases synchronously.
 *   3. Rapid open -> close -> open. A pending release from the previous close
 *      would land on the node that is now legitimately open. -> the listeners
 *      AND the timer are torn down by the same cleanup, which runs on every
 *      change of `open`.
 *
 * The score is untouched: presence is a pure DOM-lifecycle concern (when to
 * keep a node), not behavior. The WC and Astro performances share the mechanism
 * through the same `hidden`-attribute shape the React dropdown-menu uses.
 *
 * @example
 * const { present, ref, state } = usePresence(open);
 * return present ? <div ref={ref} data-state={state} /> : null;
 */
import * as React from 'react';

export type PresenceState = 'open' | 'closed';

export interface Presence {
  /** Render the node while true; it stays true through the exit animation. */
  present: boolean;
  /** Attach to the animated node so presence can watch its animation end. */
  ref: (element: HTMLElement | null) => void;
  /** 'open' | 'closed' -- put on the node as data-state; the exit CSS keys off it. */
  state: PresenceState;
}

/**
 * Milliseconds in a CSS time string, or 0 for anything that is not one.
 * '0.2s' -> 200, '200ms' -> 200, '0s' / '' / undefined -> 0.
 */
function timeMs(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return value.trim().endsWith('ms') ? parsed : parsed * 1000;
}

/** The longest duration+delay across a comma-separated CSS time list. */
function longestRun(durations: string, delays: string): number {
  const durationParts = durations.split(',');
  const delayParts = delays.split(',');
  let longest = 0;
  for (const [index, duration] of durationParts.entries()) {
    // CSS repeats the shorter list; an absent delay is 0 either way.
    const delay = delayParts[index % (delayParts.length || 1)] ?? '';
    longest = Math.max(longest, timeMs(duration) + timeMs(delay));
  }
  return longest;
}

interface ExitMeasurement {
  /** How long the exit will run, in ms; 0 means nothing is running. */
  runMs: number;
  /**
   * The exit animation's name, or null if the exit is a transition (or nothing).
   *
   * Presence must know this, not just the duration. When a close interrupts a
   * RUNNING ENTER, the browser cancels the enter animation and fires
   * `animationcancel` on the same node -- and a handler that releases on any
   * animation event unmounts the overlay instantly, on the enter's death rather
   * than the exit's completion. That is a race (it only fires if the enter was
   * still running), it truncates the exit to nothing, and it was invisible in
   * jsdom: it took watching a real browser to see it. The name is the filter.
   */
  name: string | null;
}

/**
 * The animation name an event carries, or null when it does not carry one --
 * a transitionend, or a bare Event. Null means "unidentified", and an
 * unidentified end is honoured rather than filtered out: the filter exists to
 * reject a DIFFERENT, named animation, not to demand identification.
 */
function animationNameOf(event: Event): string | null {
  if (typeof AnimationEvent === 'undefined' || !(event instanceof AnimationEvent)) return null;
  return event.animationName;
}

/**
 * Measure the exit the node is about to run.
 *
 * A zero runMs is the reduced-motion answer AND the no-animation answer, and
 * both mean the same thing to presence: release now, do not wait for an event.
 */
function measureExit(element: HTMLElement): ExitMeasurement {
  if (typeof getComputedStyle !== 'function') return { runMs: 0, name: null };
  const style = getComputedStyle(element);
  const animationName = style.animationName || 'none';
  const animated =
    animationName !== 'none'
      ? longestRun(style.animationDuration || '', style.animationDelay || '')
      : 0;
  const transitioned =
    (style.transitionProperty || 'none') !== 'none'
      ? longestRun(style.transitionDuration || '', style.transitionDelay || '')
      : 0;
  return {
    runMs: Math.max(animated, transitioned),
    // Only claim a name when the animation is what we are actually waiting on.
    name: animated >= transitioned && animated > 0 ? animationName : null,
  };
}

/**
 * Margin on the derived fallback. The timer is a BACKSTOP, not the schedule --
 * it must never beat a healthy animation to the punch, or every exit truncates.
 * One frame of slack plus a small proportional allowance covers compositor
 * jitter without holding a wedged node around for a perceptible extra beat.
 */
function fallbackMs(runMs: number): number {
  return Math.ceil(runMs * 1.5) + 50;
}

export function usePresence(open: boolean): Presence {
  const [present, setPresent] = React.useState(open);
  const nodeRef = React.useRef<HTMLElement | null>(null);

  // Open SYNCHRONOUSLY (React's adjust-state-during-render pattern): the node
  // must mount in the same commit as the open dispatch, so effects that
  // resolve it by id (focus-trap) find it, and so it mounts WITH its enter
  // animation attached rather than a frame later. Only the exit is deferred.
  if (open && !present) setPresent(true);

  React.useEffect(() => {
    if (open) return;
    // Closing: the re-render already applied data-state=closed, so the exit CSS
    // is running -- hold present until it ends, then release to unmount.
    const node = nodeRef.current;
    if (!node) {
      setPresent(false);
      return;
    }
    const { runMs, name: exitName } = measureExit(node);
    if (runMs === 0) {
      // No movement to wait for (reduced motion, or no exit animation at all).
      // Releasing here is what keeps the reduced-motion path off an
      // `animationend` that is never coming.
      setPresent(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const release = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      setPresent(false);
    };
    const done = (event: Event) => {
      if (event.target !== node) return; // ignore descendant animations
      // ...and ignore the DYING ENTER. Interrupting a running enter cancels it,
      // which fires animationcancel on this very node; releasing on that ends
      // the exit before its first frame paints.
      const fired = animationNameOf(event);
      if (exitName !== null && fired !== null && fired !== exitName) return;
      release();
    };
    node.addEventListener('animationend', done);
    node.addEventListener('animationcancel', done);
    node.addEventListener('transitionend', done);
    // The backstop. A cancelled animation fires `animationcancel` and is caught
    // above; an animation that is REPLACED, or a transition on a property that
    // never actually changes, fires nothing, and only this releases the node.
    timer = setTimeout(release, fallbackMs(runMs));

    return () => {
      // Reopening mid-exit lands here: both the listeners and the pending
      // backstop die before they can unmount a node that is now open again.
      if (timer !== undefined) clearTimeout(timer);
      node.removeEventListener('animationend', done);
      node.removeEventListener('animationcancel', done);
      node.removeEventListener('transitionend', done);
    };
  }, [open]);

  const ref = React.useCallback((element: HTMLElement | null) => {
    nodeRef.current = element;
  }, []);

  return { present, ref, state: open ? 'open' : 'closed' };
}
