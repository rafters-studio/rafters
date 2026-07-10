/**
 * React render adapter + the shared dialog conformance suite, plus the
 * React-idiomatic scenarios the shared suite cannot express portably
 * (controlled/uncontrolled callbacks, explicit DialogPortal composition,
 * forceMount, the `container` prop, veto callbacks -- see
 * conformance-suite.ts's header for why these stay local; no WC
 * counterpart exists for any of them).
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
import { assertAxeClean, partElement } from '../../harness/conformance';
import {
  runDialogConformance,
  type DialogAdapter,
  type DialogScenarioProps,
} from './conformance-suite';

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

const reactAdapter: DialogAdapter = {
  name: 'react',
  render(props: DialogScenarioProps) {
    const utils = render(
      <TestDialog
        defaultOpen={props.defaultOpen}
        modal={props.modal}
        withDescription={props.withDescription}
      />,
    );
    return { host: body(), root: body(), cleanup: () => utils.unmount() };
  },
};

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

runDialogConformance(reactAdapter);

describe('dialog conformance [react] framework-specific', () => {
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
