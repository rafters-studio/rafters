/**
 * Playwright harness entry for the presence race spec (#2157).
 *
 * esbuild bundles THIS file -- which mounts the REAL `usePresence` from
 * `packages/ui/src/hooks` into a real React root -- into a single IIFE injected
 * via `page.setContent`. There is no dev server in this repo and a spec may not
 * start one (see test/presence/presence-exit.e2e.ts), so this is how a browser
 * spec drives the genuine hook rather than a hand-copied imitation of it.
 *
 * `React.createElement`, not JSX, so the entry stays a plain `.ts` file with no
 * transform to configure.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { usePresence } from '../../../packages/ui/src/hooks/use-presence';

/** What the spec reads back off `window` after driving the buttons. */
export interface PresenceProbe {
  /** `performance.now()` when the close button was pressed. */
  closedAt: number | null;
  /** `performance.now()` when #node actually left the DOM. */
  removedAt: number | null;
  /**
   * The animation names still running on the node when close was pressed, read
   * BEFORE React reacted. A spec that means to interrupt a running enter has to
   * prove the enter was actually running, or it silently degrades into a plain
   * close.
   */
  runningAtClose: string[] | null;
  /**
   * The animation names the HOOK saw -- captured by wrapping the node's own
   * `getAnimations`, so this is literally the list presence awaited. The point
   * of the whole rewrite is that this is the EXIT, not a stale enter, which
   * depends on `getAnimations()` flushing pending style before it answers.
   */
  observedByHook: string[] | null;
  /** Computed timing of the animations the hook saw, in milliseconds. */
  observedDurations: number[] | null;
}

interface HarnessWindow extends Window {
  __presence: PresenceProbe;
}

function names(animations: Animation[]): string[] {
  return animations.map((animation) => {
    const named = animation as Animation & { animationName?: string };
    return named.animationName ?? '';
  });
}

function durations(animations: Animation[]): number[] {
  return animations.map((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0));
}

function Overlay({ probe }: { probe: PresenceProbe }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const { present, ref, state } = usePresence(open);
  const nodeRef = React.useRef<HTMLElement | null>(null);

  // Compose our own recorder over presence's ref, and wrap the node's
  // `getAnimations` so every call the HOOK makes is recorded. The wrapper
  // delegates to the native method and returns the native Animation objects
  // untouched -- it observes, it does not substitute.
  const attach = React.useCallback(
    (element: HTMLDivElement | null) => {
      nodeRef.current = element;
      if (element !== null && !Object.hasOwn(element, 'getAnimations')) {
        const native = element.getAnimations.bind(element);
        Object.defineProperty(element, 'getAnimations', {
          configurable: true,
          value: (...args: Parameters<Element['getAnimations']>) => {
            const running = native(...args);
            probe.observedByHook = names(running);
            probe.observedDurations = durations(running);
            return running;
          },
        });
      }
      ref(element);
    },
    [ref, probe],
  );

  const close = React.useCallback(() => {
    const node = nodeRef.current;
    probe.runningAtClose = node === null ? [] : names(node.getAnimations());
    probe.closedAt = performance.now();
    setOpen(false);
  }, [probe]);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'button',
      { id: 'open', type: 'button', onClick: () => setOpen(true) },
      'open',
    ),
    React.createElement('button', { id: 'close', type: 'button', onClick: close }, 'close'),
    present
      ? React.createElement('div', { id: 'node', ref: attach, 'data-state': state }, 'content')
      : null,
  );
}

export function mount(host: HTMLElement): void {
  const probe: PresenceProbe = {
    closedAt: null,
    removedAt: null,
    runningAtClose: null,
    observedByHook: null,
    observedDurations: null,
  };
  (window as unknown as HarnessWindow).__presence = probe;

  // Removal is observed off the DOM, not off React's state, so the timestamp is
  // the moment the node genuinely stopped rendering.
  new MutationObserver((records) => {
    for (const record of records) {
      for (const removed of record.removedNodes) {
        if (removed instanceof HTMLElement && removed.id === 'node') {
          probe.removedAt = performance.now();
        }
      }
    }
  }).observe(host, { childList: true, subtree: true });

  createRoot(host).render(React.createElement(Overlay, { probe }));
}
