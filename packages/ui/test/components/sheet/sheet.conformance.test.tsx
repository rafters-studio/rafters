/**
 * React performance of the sheet score, driven end to end. The portal renders
 * into document.body, so part queries run against body, not the RTL container.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from '../../../src/components/sheet/sheet';
import { sheet } from '../../../src/components/sheet/sheet.behavior';
import { sheetSideClasses } from '../../../src/components/sheet/sheet.classes';
import {
  assertAxeClean,
  assertContractFulfillment,
  domPartIds,
  partElement,
} from '../../harness/conformance';
import type { SheetSide } from '../../../src/components/sheet/sheet.behavior';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  side?: SheetSide;
  onOpenChange?: (open: boolean) => void;
  withDescription?: boolean;
}

function TestSheet({ withDescription = true, side, ...props }: SetupProps) {
  return (
    <Sheet {...props}>
      <SheetTrigger>Open filters</SheetTrigger>
      <SheetContent {...(side ? { side } : {})}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          {withDescription ? <SheetDescription>Refine the results.</SheetDescription> : null}
        </SheetHeader>
        <button type="button">Apply</button>
        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('sheet conformance [react]', () => {
  it('closed: only the trigger renders, collapsed and axe-clean', async () => {
    render(<TestSheet />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    await assertAxeClean(body());
  });

  it('open: every part renders and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const config = { defaultOpen: false, modal: true };
    const state = { open: true };
    assertContractFulfillment(sheet, body(), state, config, [
      'trigger',
      'content',
      'overlay',
      'title',
      'description',
      'close',
    ]);
    await assertAxeClean(body());
  });

  it('side selects the positional variant; default is right', async () => {
    const user = userEvent.setup();
    render(<TestSheet side="left" />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.className).toContain(sheetSideClasses.left);
    expect(content.className).not.toContain(sheetSideClasses.right);

    cleanup();
    document.body.replaceChildren();
    render(<TestSheet />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect((partElement(body(), 'content') as HTMLElement).className).toContain(
      sheetSideClasses.right,
    );
  });

  it('omitted description projects NO aria-describedby', async () => {
    const user = userEvent.setup();
    render(<TestSheet withDescription={false} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content');
    expect(content?.hasAttribute('aria-describedby')).toBe(false);
    expect(content?.getAttribute('aria-labelledby')).toBeTruthy();
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content', 'title', 'description'] as const);
    const trigger = partElement(body(), 'trigger');
    const content = partElement(body(), 'content');
    expect(trigger?.getAttribute('aria-controls')).toBe(ids.content);
    expect(content?.getAttribute('aria-labelledby')).toBe(ids.title);
    expect(content?.getAttribute('aria-describedby')).toBe(ids.description);
  });

  it('focus moves into the sheet and Tab is trapped', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);
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
    render(<TestSheet />);
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
        <TestSheet />
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
    render(<TestSheet />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'close') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('scroll is locked while open and released on close', async () => {
    const user = userEvent.setup();
    render(<TestSheet />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('non-modal: no overlay, no trap, no scroll lock, Escape still works', async () => {
    const user = userEvent.setup();
    render(<TestSheet modal={false} />);
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
    render(<TestSheet defaultOpen />);
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<TestSheet open={false} onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestSheet open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(partElement(body(), 'content')).not.toBeNull();

    rerender(<TestSheet open={false} onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('explicit Portal + Overlay composition renders without the automatic wrappers', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetTitle>Composed</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    // No DUPLICATE overlay: Content skips its automatic wrapper inside an
    // explicit portal, so only the consumer's SheetOverlay is present.
    expect(document.querySelectorAll('[data-part="overlay"]')).toHaveLength(1);
    // Sheet oracle parity: the close button renders even inside an explicit
    // portal (showCloseButton ?? true), unlike dialog.
    expect(partElement(body(), 'close')).not.toBeNull();
    await assertAxeClean(body());
  });

  it('forceMount keeps the content in the DOM, hidden and inert, while closed', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent forceMount>
          <SheetTitle>Always mounted</SheetTitle>
        </SheetContent>
      </Sheet>,
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
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent container={target}>
          <SheetTitle>Housed</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
  });

  it('onEscapeKeyDown veto keeps the sheet open', async () => {
    const user = userEvent.setup();
    render(
      <Sheet defaultOpen>
        <SheetContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <SheetTitle>Stubborn</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('onPointerDownOutside veto keeps the sheet open; without veto it closes', async () => {
    const user = userEvent.setup();
    const outside = vi.fn((event: Event) => event.preventDefault());
    const { unmount } = render(
      <div>
        <button type="button">Elsewhere</button>
        <Sheet defaultOpen>
          <SheetContent onPointerDownOutside={outside}>
            <SheetTitle>Guarded</SheetTitle>
          </SheetContent>
        </Sheet>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(outside).toHaveBeenCalled();
    expect(partElement(body(), 'content')).not.toBeNull();
    unmount();

    render(
      <div>
        <button type="button">Elsewhere</button>
        <Sheet defaultOpen>
          <SheetContent>
            <SheetTitle>Unguarded</SheetTitle>
          </SheetContent>
        </Sheet>
      </div>,
    );
    await user.click(document.querySelector('button') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('close component closes', async () => {
    const user = userEvent.setup();
    render(
      <Sheet defaultOpen>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Manual</SheetTitle>
          <SheetClose>Done</SheetClose>
        </SheetContent>
      </Sheet>,
    );
    const closer = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Done',
    ) as HTMLElement;
    await user.click(closer);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestSheet onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
