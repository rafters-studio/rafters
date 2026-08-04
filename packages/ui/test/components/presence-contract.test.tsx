/**
 * THE PRESENCE CONTRACT, across its three proof components (#1996).
 *
 * The per-component conformance suites drive behavior; this file drives the one
 * thing they all share and none of them owned: the EXIT WINDOW. The node must
 * still be there while its exit keyframe runs, carrying data-state=closed and
 * `inert`, and must go once the keyframe ends.
 *
 * What was actually broken before this: not the attribute. `data-state` has
 * always reached the content node -- the `disclosable` slice contributes it and
 * every one of the three spreads `aria.content`. What was missing was the HOLD.
 * Closing unmounted (or `hidden`-ed) the node in the same commit that flipped
 * data-state, so the exit keyframe was never given a frame to paint. A test that
 * only asserts "closed means gone" passes happily against that bug, which is why
 * every case here asserts the node is present DURING the exit, not just absent
 * after it.
 *
 * And presence deliberately does NOT write data-state itself -- the duplicate
 * assignment it once carried was dead, because disclosable's contribution spread
 * over it and the two values are equal on every render anyway. These cases read
 * the attribute without presence writing it, which is what proves the single
 * remaining writer is sufficient across all three (asChild path included).
 */
import * as React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '../../src/components/dialog/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../src/components/dropdown-menu/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../src/components/popover/popover';

/** Report a running 200ms exit keyframe, the way the compiled sheet would. */
function runningExitKeyframe() {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    animationName: 'scale-out',
    animationDuration: '0.2s',
    animationDelay: '0s',
    transitionProperty: 'none',
    transitionDuration: '0s',
    transitionDelay: '0s',
  } as unknown as CSSStyleDeclaration);
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const cases = [
  {
    name: 'dialog',
    // Unmounted when closed -- presence gates the MOUNT.
    absent: (node: HTMLElement | null) => expect(node).toBeNull(),
    render: (open: boolean) => (
      <Dialog open={open}>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: 'popover',
    absent: (node: HTMLElement | null) => expect(node).toBeNull(),
    render: (open: boolean) => (
      <Popover open={open}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>
    ),
  },
  {
    name: 'dropdown-menu',
    // Present-but-hidden in light DOM -- presence gates `hidden` instead. Same
    // mechanism: leaving display:none starts the keyframe, and the exit keyframe
    // needs `hidden` withheld until it has run. Post-exit the node is BOTH
    // hidden and inert: inert landed at the start of the exit and never lifts
    // while closed, so a menu that is merely `hidden` would be a regression of
    // the inert-not-hidden ruling in the other direction.
    absent: (node: HTMLElement | null) => {
      expect(node?.hasAttribute('hidden')).toBe(true);
      expect(node?.hasAttribute('inert')).toBe(true);
    },
    render: (open: boolean) => (
      <DropdownMenu open={open}>
        <DropdownMenuTrigger aria-label="Options">Options</DropdownMenuTrigger>
        <DropdownMenuContent aria-label="Options">
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

describe('presence contract: dropdown-menu via asChild', () => {
  // asChild routes every part prop through mergeProps + cloneElement instead of
  // onto a div this file controls. If `ref` or `data-state` is dropped in that
  // merge, presence waits on a node that never receives the exit classes -- the
  // menu closes with no exit and nothing else in the suite would notice, because
  // every other case renders the plain form.
  function renderAt(open: boolean) {
    return (
      <DropdownMenu open={open}>
        <DropdownMenuTrigger aria-label="Options">Options</DropdownMenuTrigger>
        <DropdownMenuContent asChild aria-label="Options">
          <div>
            <DropdownMenuItem>Edit</DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it('carries data-state onto the cloned child', () => {
    render(renderAt(true));
    expect(content()?.getAttribute('data-state')).toBe('open');
  });

  it('holds the cloned child through its exit keyframe, then hides it', () => {
    const { rerender } = render(renderAt(true));
    runningExitKeyframe();

    rerender(renderAt(false));
    const node = content();
    // The ref reached the clone: presence measured a real node and is waiting.
    expect(node?.hasAttribute('hidden')).toBe(false);
    expect(node?.getAttribute('data-state')).toBe('closed');

    act(() => {
      node?.dispatchEvent(new Event('animationend'));
    });
    expect(content()?.hasAttribute('hidden')).toBe(true);
  });
});

describe.each(cases)('presence contract: $name', ({ render: renderAt, absent }) => {
  it('mounts open, carrying the data-state the enter keyframe keys off', () => {
    render(renderAt(true));
    expect(content()?.getAttribute('data-state')).toBe('open');
  });

  it('stays in the DOM as data-state=closed while the exit keyframe runs', () => {
    const { rerender } = render(renderAt(true));
    runningExitKeyframe();

    rerender(renderAt(false));

    const node = content();
    expect(node).not.toBeNull();
    expect(node?.getAttribute('data-state')).toBe('closed');
    // The exit is renderable: the node is still attached, so frames of the
    // closed keyframe actually paint before it goes.
    expect(node?.isConnected).toBe(true);
  });

  it('projects inert -- not hidden -- for the whole exit window', () => {
    // The ratified inert-not-hidden ruling. A closing overlay is semantically
    // gone the instant state flips: it must leave the a11y tree, the tab order,
    // and hit-testing immediately. But `hidden` is display:none, and applying it
    // now would kill the exit keyframe outright -- the very thing presence is
    // holding the node for. `inert` gives the semantics without the display,
    // which is why it is the attribute that lands at the START of the window.
    const { rerender } = render(renderAt(true));
    // Open: nothing is inert. Nothing to assert against later otherwise -- an
    // always-inert node would pass the exit-window check for the wrong reason.
    expect(content()?.hasAttribute('inert')).toBe(false);

    runningExitKeyframe();
    rerender(renderAt(false));

    const node = content();
    expect(node?.hasAttribute('inert')).toBe(true);
    // ...and it is genuinely the exit window: still connected, still animating.
    expect(node?.isConnected).toBe(true);
    expect(node?.getAttribute('data-state')).toBe('closed');

    // Reopening mid-exit lifts it again, so an interrupted close cannot leave a
    // live overlay permanently untabbable.
    rerender(renderAt(true));
    expect(content()?.hasAttribute('inert')).toBe(false);
  });

  it('goes once the exit keyframe ends', () => {
    const { rerender } = render(renderAt(true));
    runningExitKeyframe();
    rerender(renderAt(false));

    const node = content();
    expect(node).not.toBeNull();
    act(() => {
      node?.dispatchEvent(new Event('animationend'));
    });

    absent(content());
  });

  it('reduced motion: closes without waiting on an animationend that never fires', () => {
    const { rerender } = render(renderAt(true));
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      animationName: 'none',
      animationDuration: '0s',
      animationDelay: '0s',
      transitionProperty: 'none',
      transitionDuration: '0s',
      transitionDelay: '0s',
    } as unknown as CSSStyleDeclaration);

    rerender(renderAt(false));

    // No event dispatched, no timer advanced.
    absent(content());
  });

  it('rapid open/close/open does not wedge presence', () => {
    const { rerender } = render(renderAt(true));
    runningExitKeyframe();

    rerender(renderAt(false));
    rerender(renderAt(true));
    expect(content()?.getAttribute('data-state')).toBe('open');

    // The interrupted exit's own end event, arriving late against the reopened
    // node, must not take it away.
    const node = content();
    act(() => {
      node?.dispatchEvent(new Event('animationend'));
    });
    expect(content()?.getAttribute('data-state')).toBe('open');

    // And a subsequent genuine close still completes.
    rerender(renderAt(false));
    const closing = content();
    expect(closing?.getAttribute('data-state')).toBe('closed');
    act(() => {
      closing?.dispatchEvent(new Event('animationend'));
    });
    absent(content());
  });
});
