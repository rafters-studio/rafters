/**
 * React performance of the dialog score, driven end to end. The portal
 * renders into document.body, so part queries run against body, not the
 * RTL container.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../../../src/components/dialog/dialog';
import { dialog } from '../../../src/components/dialog/dialog.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  domPartIds,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  withDescription?: boolean;
}

function TestDialog({ withDescription = true, ...props }: SetupProps) {
  return (
    <Dialog {...props}>
      <DialogTrigger>Open settings</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          {withDescription ? <DialogDescription>Adjust your preferences.</DialogDescription> : null}
        </DialogHeader>
        <button type="button">Save</button>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('dialog conformance [react]', () => {
  it('closed: only the trigger renders, collapsed and axe-clean', async () => {
    render(<TestDialog />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    await assertAxeClean(body());
  });

  it('open: every part renders and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const config = { defaultOpen: false, modal: true };
    const state = { open: true };
    assertContractFulfillment(dialog, body(), state, config, [
      'trigger',
      'content',
      'overlay',
      'title',
      'description',
      'close',
    ]);
    await assertAxeClean(body());
  });

  it('omitted description projects NO aria-describedby', async () => {
    const user = userEvent.setup();
    render(<TestDialog withDescription={false} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content');
    expect(content?.hasAttribute('aria-describedby')).toBe(false);
    expect(content?.getAttribute('aria-labelledby')).toBeTruthy();
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content', 'title', 'description'] as const);
    const trigger = partElement(body(), 'trigger');
    const content = partElement(body(), 'content');
    expect(trigger?.getAttribute('aria-controls')).toBe(ids.content);
    expect(content?.getAttribute('aria-labelledby')).toBe(ids.title);
    expect(content?.getAttribute('aria-describedby')).toBe(ids.description);
  });

  it('focus moves into the dialog and Tab is trapped', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.contains(document.activeElement)).toBe(true);

    const focusable = Array.from(content.querySelectorAll<HTMLElement>('button:not([disabled])'));
    for (let i = 0; i < focusable.length + 1; i += 1) {
      await user.tab();
      expect(content.contains(document.activeElement)).toBe(true);
    }
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('pointerdown outside dismisses; on the trigger it toggles closed, not closed-then-open', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestDialog />
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
    render(<TestDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'close') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('scroll is locked while open and released on close', async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('non-modal: no overlay, no trap, no scroll lock, Escape still works', async () => {
    const user = userEvent.setup();
    render(<TestDialog modal={false} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'overlay')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.getAttribute('aria-modal')).toBeNull();

    (content.querySelector('button') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('defaultOpen mounts open with the trap live', () => {
    render(<TestDialog defaultOpen />);
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<TestDialog open={false} onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestDialog open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(partElement(body(), 'content')).not.toBeNull();

    rerender(<TestDialog open={false} onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('explicit Portal + Overlay composition renders without the automatic wrappers', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Composed</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="overlay"]')).toHaveLength(1);
    // Oracle default: no automatic close button inside an explicit portal.
    expect(partElement(body(), 'close')).toBeNull();
    await assertAxeClean(body());
  });

  it('forceMount keeps the content in the DOM, hidden and inert, while closed', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent forceMount>
          <DialogTitle>Always mounted</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
    expect(content?.closest('[hidden]')).not.toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('container portals the content into the given element', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'portal-target';
    document.body.appendChild(target);
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent container={target}>
          <DialogTitle>Housed</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
  });

  it('onEscapeKeyDown veto keeps the dialog open', async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogTitle>Stubborn</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('onPointerDownOutside veto keeps the dialog open; without veto it closes', async () => {
    const user = userEvent.setup();
    const outside = vi.fn((event: Event) => event.preventDefault());
    const { unmount } = render(
      <div>
        <button type="button">Elsewhere</button>
        <Dialog defaultOpen>
          <DialogContent onPointerDownOutside={outside}>
            <DialogTitle>Guarded</DialogTitle>
          </DialogContent>
        </Dialog>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(outside).toHaveBeenCalled();
    expect(partElement(body(), 'content')).not.toBeNull();
    unmount();

    render(
      <div>
        <button type="button">Elsewhere</button>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Unguarded</DialogTitle>
          </DialogContent>
        </Dialog>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestDialog onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
