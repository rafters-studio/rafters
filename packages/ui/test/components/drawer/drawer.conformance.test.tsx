/**
 * React performance of the drawer score, driven end to end. The portal renders
 * into document.body, so part queries run against body, not the RTL container.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  type DrawerProps,
} from '../../../src/components/drawer/drawer';
import { drawer } from '../../../src/components/drawer/drawer.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  domPartIds,
  partElement,
} from '../../harness/conformance';

interface SetupProps extends Partial<DrawerProps> {
  withDescription?: boolean;
}

function TestDrawer({ withDescription = true, children, ...props }: SetupProps) {
  return (
    <Drawer {...props}>
      <DrawerTrigger>Open actions</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Actions</DrawerTitle>
          {withDescription ? <DrawerDescription>Pick an action.</DrawerDescription> : null}
        </DrawerHeader>
        <button type="button">Save</button>
        <DrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('drawer conformance [react]', () => {
  it('closed: only the trigger renders, collapsed and axe-clean', async () => {
    render(<TestDrawer />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    await assertAxeClean(body());
  });

  it('open: every part renders and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    render(<TestDrawer />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const config = { defaultOpen: false, modal: true };
    const state = { open: true };
    assertContractFulfillment(drawer, body(), state, config, [
      'trigger',
      'content',
      'overlay',
      'title',
      'description',
      'close',
    ]);
    await assertAxeClean(body());
  });

  it('side is edge-only: an explicit edge changes classes, never the dialog ARIA', async () => {
    const user = userEvent.setup();
    render(<TestDrawer side="right" />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.getAttribute('role')).toBe('dialog');
    expect(content.getAttribute('aria-modal')).toBe('true');
    expect(content.className).toContain('right-0');
  });

  it('omitted description projects NO aria-describedby', async () => {
    const user = userEvent.setup();
    render(<TestDrawer withDescription={false} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content');
    expect(content?.hasAttribute('aria-describedby')).toBe(false);
    expect(content?.getAttribute('aria-labelledby')).toBeTruthy();
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestDrawer />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content', 'title', 'description'] as const);
    const trigger = partElement(body(), 'trigger');
    const content = partElement(body(), 'content');
    expect(trigger?.getAttribute('aria-controls')).toBe(ids.content);
    expect(content?.getAttribute('aria-labelledby')).toBe(ids.title);
    expect(content?.getAttribute('aria-describedby')).toBe(ids.description);
  });

  it('focus moves into the drawer and Tab is trapped', async () => {
    const user = userEvent.setup();
    render(<TestDrawer />);
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
    render(<TestDrawer />);
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
        <TestDrawer />
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
    render(<TestDrawer />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'close') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('scroll is locked while open and released on close', async () => {
    const user = userEvent.setup();
    render(<TestDrawer />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('non-modal: no overlay, no trap, no scroll lock, Escape still works', async () => {
    const user = userEvent.setup();
    render(<TestDrawer modal={false} />);
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
    render(<TestDrawer defaultOpen />);
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<TestDrawer open={false} onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestDrawer open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(partElement(body(), 'content')).not.toBeNull();

    rerender(<TestDrawer open={false} onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('explicit Portal + Overlay composition renders without the automatic wrappers', async () => {
    const user = userEvent.setup();
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Composed</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
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
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent forceMount>
          <DrawerTitle>Always mounted</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
    expect(content?.hasAttribute('hidden')).toBe(true);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('container portals the content into the given element', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'portal-target';
    document.body.appendChild(target);
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent container={target}>
          <DrawerTitle>Housed</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
  });

  it('onEscapeKeyDown veto keeps the drawer open', async () => {
    const user = userEvent.setup();
    render(
      <Drawer defaultOpen>
        <DrawerContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <DrawerTitle>Stubborn</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('onPointerDownOutside veto keeps the drawer open; without veto it closes', async () => {
    const user = userEvent.setup();
    const outside = vi.fn((event: Event) => event.preventDefault());
    const { unmount } = render(
      <div>
        <button type="button">Elsewhere</button>
        <Drawer defaultOpen>
          <DrawerContent onPointerDownOutside={outside}>
            <DrawerTitle>Guarded</DrawerTitle>
          </DrawerContent>
        </Drawer>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(outside).toHaveBeenCalled();
    expect(partElement(body(), 'content')).not.toBeNull();
    unmount();

    render(
      <div>
        <button type="button">Elsewhere</button>
        <Drawer defaultOpen>
          <DrawerContent>
            <DrawerTitle>Unguarded</DrawerTitle>
          </DrawerContent>
        </Drawer>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestDrawer onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
