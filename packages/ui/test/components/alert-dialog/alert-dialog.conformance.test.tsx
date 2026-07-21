/**
 * React performance of the alert-dialog score, driven end to end. The portal
 * renders into document.body, so part queries run against body, not the RTL
 * container. Where dialog dismisses on an outside click and focuses the first
 * focusable, alert-dialog does NEITHER: it never closes on an outside click,
 * and focus defaults to Cancel.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../src/components/alert-dialog/alert-dialog';
import { alertDialog } from '../../../src/components/alert-dialog/alert-dialog.behavior';
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
  withDescription?: boolean;
}

function TestAlertDialog({ withDescription = true, ...props }: SetupProps) {
  return (
    <AlertDialog {...props}>
      <AlertDialogTrigger>Delete account</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          {withDescription ? (
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('alert-dialog conformance [react]', () => {
  it('closed: only the trigger renders, collapsed and axe-clean', async () => {
    render(<TestAlertDialog />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    await assertAxeClean(body());
  });

  it('open: every part renders and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);

    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(alertDialog, body(), state, config, [
      'trigger',
      'content',
      'overlay',
      'title',
      'description',
      'cancel',
      'action',
    ]);
    await assertAxeClean(body());
  });

  it('content carries role=alertdialog and is always modal', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content');
    expect(content?.getAttribute('role')).toBe('alertdialog');
    expect(content?.getAttribute('aria-modal')).toBe('true');
  });

  it('omitted description projects NO aria-describedby', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog withDescription={false} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const content = partElement(body(), 'content');
    expect(content?.hasAttribute('aria-describedby')).toBe(false);
    expect(content?.getAttribute('aria-labelledby')).toBeTruthy();
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content', 'title', 'description'] as const);
    const trigger = partElement(body(), 'trigger');
    const content = partElement(body(), 'content');
    expect(trigger?.getAttribute('aria-controls')).toBe(ids.content);
    expect(content?.getAttribute('aria-labelledby')).toBe(ids.title);
    expect(content?.getAttribute('aria-describedby')).toBe(ids.description);
  });

  it('initial focus defaults to Cancel, the safer choice', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(document.activeElement).toBe(partElement(body(), 'cancel'));
  });

  it('focus is trapped inside the dialog and Tab cycles within', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
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
    render(<TestAlertDialog />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('an outside pointerdown does NOT dismiss -- the decision is mandatory', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestAlertDialog />
      </div>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.click(document.querySelector('button') as HTMLElement);
    // Still open: unlike Dialog, the outside click is inert.
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('Cancel closes', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'cancel') as HTMLElement);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('the action closes and runs the consumer handler', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Sure?</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    await user.click(partElement(body(), 'action') as HTMLElement);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('scroll is locked while open and released on close', async () => {
    const user = userEvent.setup();
    render(<TestAlertDialog />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('defaultOpen mounts open with the trap live and focus on Cancel', () => {
    render(<TestAlertDialog defaultOpen />);
    const content = partElement(body(), 'content');
    expect(content).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(partElement(body(), 'cancel'));
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(<TestAlertDialog open={false} onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestAlertDialog open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(partElement(body(), 'content')).not.toBeNull();

    rerender(<TestAlertDialog open={false} onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('explicit Portal + Overlay composition renders without the automatic wrappers', async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Composed</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="overlay"]')).toHaveLength(1);
    await assertAxeClean(body());
  });

  it('forceMount keeps the content in the DOM, hidden and inert, while closed', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent forceMount>
          <AlertDialogTitle>Always mounted</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
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
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent container={target}>
          <AlertDialogTitle>Housed</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
  });

  it('onEscapeKeyDown veto keeps the dialog open', async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
          <AlertDialogTitle>Stubborn</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestAlertDialog onOpenChange={onOpenChange} />);
    await user.click(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
