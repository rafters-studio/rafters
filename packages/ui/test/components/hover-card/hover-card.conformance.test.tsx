/**
 * React performance of the hover-card score, driven end to end. The content
 * portals into document.body, so part queries run against body, not the RTL
 * container. Delays are zeroed so hover/focus intent resolves synchronously.
 *
 * The content is role="dialog"; the consumer names it (aria-label) so axe's
 * dialog-name rule is satisfied -- the same contract popover carries.
 */
import * as React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '../../../src/components/hover-card/hover-card';
import { hoverCard } from '../../../src/components/hover-card/hover-card.behavior';
import { resetHoverDelayState } from '../../../src/primitives/hover-delay';
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
  disableHoverableContent?: boolean;
  /** Positive close delay so the pointer can travel trigger -> content. */
  closeDelay?: number;
  /** Portal the card into a landmark for the axe assertions. */
  container?: HTMLElement | null;
}

function TestHoverCard({
  disableHoverableContent,
  closeDelay = 0,
  container,
  ...props
}: SetupProps) {
  return (
    <HoverCard
      openDelay={0}
      closeDelay={closeDelay}
      disableHoverableContent={disableHoverableContent}
      {...props}
    >
      <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
      <HoverCardContent aria-label="John Doe" container={container}>
        <span>Software Engineer</span>
      </HoverCardContent>
    </HoverCard>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  resetHoverDelayState();
});

describe('hover-card conformance [react]', () => {
  it('closed: only the trigger renders, undescribed and axe-clean', async () => {
    const main = document.createElement('main');
    document.body.appendChild(main);
    render(<TestHoverCard />, { container: main });
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger?.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger?.getAttribute('data-state')).toBe('closed');
    await assertAxeClean(body());
  });

  it('hover opens: content is role=dialog and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    const main = document.createElement('main');
    document.body.appendChild(main);
    render(<TestHoverCard container={main} />, { container: main });
    await user.hover(partElement(body(), 'trigger') as HTMLElement);

    expect(partElement(body(), 'content')).not.toBeNull();
    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(hoverCard, body(), state, config, ['trigger', 'content']);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('dialog');
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestHoverCard />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content'] as const);
    expect(partElement(body(), 'trigger')?.getAttribute('aria-describedby')).toBe(ids.content);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('dialog');
  });

  it('keyboard focus opens the card', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">before</button>
        <TestHoverCard />
      </div>,
    );
    await user.tab(); // before
    await user.tab(); // trigger anchor
    expect(document.activeElement).toBe(partElement(body(), 'trigger'));
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('Escape dismisses while focused', async () => {
    const user = userEvent.setup();
    render(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    trigger.focus();
    await user.hover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('leaving the trigger closes the card', async () => {
    const user = userEvent.setup();
    render(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.unhover(trigger);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('hoverable content holds the card open until the pointer leaves it', async () => {
    const user = userEvent.setup();
    // A positive close delay is the grace window that lets the pointer cross the
    // gap from trigger to content without the card vanishing mid-travel.
    render(<TestHoverCard closeDelay={50} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(content); // leaves trigger, enters content within the grace window
    await user.unhover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.unhover(content);
    await waitFor(() => expect(partElement(body(), 'content')).toBeNull());
  });

  it('disableHoverableContent lets the card close even while the pointer is on it', async () => {
    const user = userEvent.setup();
    render(<TestHoverCard disableHoverableContent closeDelay={50} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(content);
    await user.unhover(trigger);
    // Content hover does not hold it open: the close scheduled on trigger-leave
    // still fires.
    await waitFor(() => expect(partElement(body(), 'content')).toBeNull());
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestHoverCard onOpenChange={onOpenChange} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('controlled: content follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<TestHoverCard open={false} onOpenChange={onOpenChange} />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(body(), 'content')).toBeNull();

    rerender(<TestHoverCard open onOpenChange={onOpenChange} />);
    expect(partElement(body(), 'content')).not.toBeNull();
  });

  it('explicit Portal composition renders the card without an automatic wrapper', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'card-portal';
    document.body.appendChild(target);
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
        <HoverCardPortal container={target}>
          <HoverCardContent aria-label="John Doe">
            <span>Software Engineer</span>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
  });

  it('defaultOpen mounts the card already shown', () => {
    render(<TestHoverCard defaultOpen />);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(partElement(body(), 'trigger')?.getAttribute('data-state')).toBe('open');
  });

  it('Escape dismisses a defaultOpen card that never received a hover/focus event', () => {
    // Regression: dismissal routed only through the hover primitive left a
    // defaultOpen card open, because no prior hover/focus had given the primitive
    // any state to close. fireEvent (not user.keyboard) reproduces it: a raw
    // Escape keydown with no focus event to sync the primitive first.
    render(<TestHoverCard defaultOpen />);
    expect(partElement(body(), 'content')).not.toBeNull();
    fireEvent.keyDown(partElement(body(), 'trigger') as HTMLElement, { key: 'Escape' });
    expect(partElement(body(), 'content')).toBeNull();
  });
});
