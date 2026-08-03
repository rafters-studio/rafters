/**
 * THE PRESENCE CONTRACT, across its three proof components (#1996).
 *
 * The per-component conformance suites drive behavior; this file drives the one
 * thing they all share and none of them owned: the node must carry data-state,
 * must STILL BE THERE while its exit keyframe runs, and must go once it ends.
 *
 * Before this, data-state was never set on any of the three -- dialog's classes
 * already shipped a `data-[state=closed]:pointer-events-none` selector that
 * could not match anything -- so the exit keyframe never started and presence
 * had nothing to hold. A test that only asserts "closed means gone" passes
 * happily against that bug, which is why every case here asserts the node is
 * present DURING the exit, not just absent after it.
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
    // needs `hidden` withheld until it has run.
    absent: (node: HTMLElement | null) => expect(node?.hasAttribute('hidden')).toBe(true),
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
