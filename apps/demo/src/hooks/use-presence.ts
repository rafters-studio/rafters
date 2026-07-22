/**
 * usePresence -- the React Presence adapter (wave 0-B).
 *
 * The overlay performances (dialog, navigation-menu content) mount on open
 * and, without this, unmount the instant they close -- enter-only, no exit
 * animation. usePresence keeps the node PRESENT through its exit animation:
 * on close it flips the returned state to 'closed' (so the exit CSS runs),
 * holds `present` true until the node's animation/transition ends, then
 * releases it to unmount. If the closed node has no running animation, it
 * releases immediately -- an un-animated overlay stays enter/exit-instant.
 *
 * The score is untouched: presence is a pure DOM-lifecycle concern (when to
 * keep a node), not behavior. The WC and Astro performances need no adapter
 * -- their content is present-but-hidden, so the exit CSS runs on the same
 * node without an unmount to defer.
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
  /** 'open' | 'closed' -- drive the data-state the exit CSS keys off. */
  state: PresenceState;
}

/** A duration string ('0.2s', '200ms') is real iff it parses to > 0; '0s',
 *  '' and unset all read as no duration. */
function hasDuration(value: string | undefined): boolean {
  return parseFloat(value ?? '') > 0;
}

function isAnimating(element: HTMLElement): boolean {
  if (typeof getComputedStyle !== 'function') return false;
  const style = getComputedStyle(element);
  const animated =
    (style.animationName || 'none') !== 'none' && hasDuration(style.animationDuration);
  const transitioned =
    hasDuration(style.transitionDuration) && (style.transitionProperty || 'none') !== 'none';
  return animated || transitioned;
}

export function usePresence(open: boolean): Presence {
  const [present, setPresent] = React.useState(open);
  const nodeRef = React.useRef<HTMLElement | null>(null);

  // Open SYNCHRONOUSLY (React's adjust-state-during-render pattern): the node
  // must mount in the same commit as the open dispatch, so effects that
  // resolve it by id (focus-trap) find it. Only the exit is deferred.
  if (open && !present) setPresent(true);

  React.useEffect(() => {
    if (open) return;
    // Closing: the re-render already applied data-state=closed, so the exit CSS
    // is running -- hold present until it ends, then release to unmount.
    const node = nodeRef.current;
    if (!node || !isAnimating(node)) {
      setPresent(false);
      return;
    }
    const done = (event: Event) => {
      if (event.target !== node) return; // ignore descendant animations
      setPresent(false);
    };
    node.addEventListener('animationend', done);
    node.addEventListener('animationcancel', done);
    node.addEventListener('transitionend', done);
    return () => {
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
