/**
 * React performance of the popover score, driven end to end. The portal
 * renders into document.body, so part queries run against body, not the RTL
 * container. Popover is non-modal: focus moves in but is not trapped, scroll is
 * never locked, and closing does not restore focus to the trigger.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from '../../../src/components/popover/popover';
import { popover } from '../../../src/components/popover/popover.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  domPartIds,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  withClose?: boolean;
}

function TestPopover({ withClose = true, ...props }: SetupProps) {
  return (
    <Popover {...props}>
      <PopoverTrigger>Open menu</PopoverTrigger>
      <PopoverContent aria-label="Menu options">
        <button type="button">Action</button>
        {withClose ? <PopoverClose>Dismiss</PopoverClose> : null}
      </PopoverContent>
    </Popover>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('popover conformance [react]', () => {
  it('closed: only the trigger renders, collapsed, haspopup dialog, axe-clean', async () => {
    render(<TestPopover />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    await assertAxeClean(body());
  });

  it('open: trigger and content render and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(popover, body(), state, config, ['trigger', 'content']);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('dialog');
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content'] as const);
    expect(partElement(body(), 'trigger')?.getAttribute('aria-controls')).toBe(ids.content);
  });

  it('focus moves to the first focusable inside content on open (no trap)', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.contains(document.activeElement)).toBe(true);
    expect((document.activeElement as HTMLElement).textContent).toBe('Action');
    // Non-modal: no scroll lock.
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('Escape closes the panel', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('pointerdown outside dismisses; on the trigger it toggles closed, not closed-then-open', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestPopover />
      </div>,
    );
    const trigger = partElement(body(), 'trigger') as HTMLElement;

    await user.click(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.click(document.querySelector('button') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();

    await user.click(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.click(trigger);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('close button closes', async () => {
    const user = userEvent.setup();
    render(<TestPopover />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'close') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('an explicit anchor positions the panel without breaking the trigger wiring', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <Popover>
          <PopoverAnchor>
            <span>Anchor here</span>
          </PopoverAnchor>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent aria-label="Anchored panel">
            <button type="button">Inside</button>
          </PopoverContent>
        </Popover>
      </main>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(partElement(body(), 'anchor')).not.toBeNull();
    await assertAxeClean(body());
  });

  it('defaultOpen mounts open', () => {
    render(<TestPopover defaultOpen />);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<TestPopover open={false} onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestPopover open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(partElement(body(), 'content')).not.toBeNull();

    rerender(<TestPopover open={false} onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('explicit Portal composition renders without the automatic wrapper', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent aria-label="Composed panel">
            <button type="button">Composed</button>
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    await assertAxeClean(body());
  });

  it('forceMount keeps the content in the DOM, hidden and inert, while closed', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent forceMount>
          <button type="button">Always mounted</button>
        </PopoverContent>
      </Popover>,
    );
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
    expect(content?.hasAttribute('hidden')).toBe(true);
  });

  it('onEscapeKeyDown veto keeps the popover open', async () => {
    const user = userEvent.setup();
    render(
      <Popover defaultOpen>
        <PopoverContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <button type="button">Stubborn</button>
        </PopoverContent>
      </Popover>,
    );
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('onPointerDownOutside veto keeps the popover open; without veto it closes', async () => {
    const user = userEvent.setup();
    const outside = vi.fn((event: Event) => event.preventDefault());
    const { unmount } = render(
      <div>
        <button type="button">Elsewhere</button>
        <Popover defaultOpen>
          <PopoverContent onPointerDownOutside={outside}>
            <button type="button">Guarded</button>
          </PopoverContent>
        </Popover>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(outside).toHaveBeenCalled();
    expect(partElement(body(), 'content')).not.toBeNull();
    unmount();
    document.body.replaceChildren();

    render(
      <div>
        <button type="button">Elsewhere</button>
        <Popover defaultOpen>
          <PopoverContent>
            <button type="button">Unguarded</button>
          </PopoverContent>
        </Popover>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestPopover onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
