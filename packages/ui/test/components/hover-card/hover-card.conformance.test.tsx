/**
 * React performance of the hover-card score, driven end to end.
 *
 * WHAT CHANGED AT #2148: the preview is no longer mounted on the open axis and
 * no longer portals to document.body by default. `HoverCardRoot` renders a real
 * `<div data-part="root" data-hover-card>` and the trigger and content are DOM
 * SIBLINGS inside it, present at all times -- which is the CSS contract, since
 * the stylesheet reveals the preview through `[data-hover-card]:hover >
 * [data-part=content]` and a node that does not exist cannot be revealed.
 *
 * So the assertions here are about the score's ATTRIBUTES (data-state,
 * aria-describedby, data-dismissed), not about presence. Whether those
 * attributes make the preview visible -- and, uniquely among the three
 * hover-triggered components, hold it through a linger on the way out -- is the
 * stylesheet's half, pinned by hover-card.classes.test.ts and
 * test/motion/hover-reveal.e2e.ts.
 *
 * The content is role="dialog"; the consumer names it (aria-label) so axe's
 * dialog-name rule is satisfied -- the same contract popover carries.
 */
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '../../../src/components/hover-card/hover-card';
import { hoverCard } from '../../../src/components/hover-card/hover-card.behavior';
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
}

function TestHoverCard(props: SetupProps) {
  return (
    <HoverCard {...props}>
      <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
      <HoverCardContent aria-label="John Doe">
        <span>Software Engineer</span>
      </HoverCardContent>
    </HoverCard>
  );
}

/** axe's region best-practice rule flags top-level content, and the preview now
 *  renders in the document rather than in a portal target of the test's
 *  choosing -- so give the whole component a landmark to sit in. */
function renderInLandmark(node: React.ReactElement): void {
  render(<main>{node}</main>);
}

const body = () => document.body;
const stateOf = (part: 'trigger' | 'content') =>
  partElement(body(), part)?.getAttribute('data-state');
const rootEl = () => body().querySelector<HTMLElement>('[data-part="root"][data-hover-card]');

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('hover-card conformance [react]', () => {
  it('the root is a real element with trigger and content as DOM siblings', () => {
    renderInLandmark(<TestHoverCard />);
    const root = rootEl();
    expect(root).not.toBeNull();
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    expect(trigger.parentElement).toBe(root);
    expect(content.parentElement).toBe(root);
    expect(trigger.nextElementSibling).toBe(content);
  });

  it('closed: the preview is PRESENT, described, never hidden, and axe-clean', async () => {
    renderInLandmark(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content).not.toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(stateOf('trigger')).toBe('closed');
    expect(stateOf('content')).toBe('closed');
    expect(content.hasAttribute('hidden')).toBe(false);
    await assertAxeClean(body());
  });

  it('hover opens: content is role=dialog and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);

    expect(stateOf('content')).toBe('open');
    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(hoverCard, body(), state, config, ['trigger', 'content']);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('dialog');
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content'] as const);
    expect(partElement(body(), 'trigger')?.getAttribute('aria-describedby')).toBe(ids.content);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('dialog');
  });

  it('keyboard focus opens the card', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <button type="button">before</button>
        <TestHoverCard />
      </main>,
    );
    await user.tab(); // before
    await user.tab(); // trigger anchor
    expect(document.activeElement).toBe(partElement(body(), 'trigger'));
    expect(stateOf('content')).toBe('open');
  });

  it('Escape dismisses: the score closes AND the root raises data-dismissed', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    trigger.focus();
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    await user.keyboard('{Escape}');
    expect(stateOf('content')).toBe('closed');
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
  });

  it('leaving the trigger closes the card and clears any dismissal', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
    await user.unhover(trigger);
    expect(stateOf('content')).toBe('closed');
    expect(rootEl()?.hasAttribute('data-dismissed')).toBe(false);
  });

  it('hoverable content holds the card open: the root is the hover scope', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(trigger);
    // Trigger -> content never leaves the root, so the score stays open with no
    // grace-window timer bridging the travel. The LINGER on the way back out is
    // the stylesheet's transition-delay, not a JavaScript window.
    await user.hover(content);
    expect(stateOf('content')).toBe('open');
    await user.unhover(content);
    expect(stateOf('content')).toBe('closed');
  });

  it('disableHoverableContent narrows the hover scope to the trigger', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestHoverCard disableHoverableContent />);
    expect(rootEl()?.getAttribute('data-disable-hoverable-content')).toBe('true');
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    await user.unhover(trigger);
    // Content hover does not hold it open: the trigger alone is the scope, in
    // JavaScript exactly as in the `:has()` reveal rule.
    await user.hover(content);
    expect(stateOf('content')).toBe('closed');
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInLandmark(<TestHoverCard onOpenChange={onOpenChange} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('controlled: data-state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <main>
        <TestHoverCard open={false} onOpenChange={onOpenChange} />
      </main>,
    );
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(stateOf('content')).toBe('closed');

    rerender(
      <main>
        <TestHoverCard open onOpenChange={onOpenChange} />
      </main>,
    );
    expect(stateOf('content')).toBe('open');
  });

  it('explicit Portal composition is the opt-OUT of the sibling contract', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'card-portal';
    document.body.appendChild(target);
    render(
      <main>
        <HoverCard>
          <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
          <HoverCardPortal container={target}>
            <HoverCardContent aria-label="John Doe">
              <span>Software Engineer</span>
            </HoverCardContent>
          </HoverCardPortal>
        </HoverCard>
      </main>,
    );
    // Closed, the explicit portal renders nothing: a consumer who reaches for it
    // has taken that instance off the CSS reveal path deliberately.
    expect(target.querySelector('[data-part="content"]')).toBeNull();
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
  });

  it('defaultOpen mounts the card already shown', () => {
    renderInLandmark(<TestHoverCard defaultOpen />);
    expect(stateOf('content')).toBe('open');
    expect(stateOf('trigger')).toBe('open');
  });

  it('Escape dismisses a defaultOpen card that never received a hover/focus event', () => {
    // Regression: dismissal routed only through the retired hover primitive left
    // a defaultOpen card open, because no prior hover/focus had given it any
    // state to close. fireEvent (not user.keyboard) reproduces it.
    renderInLandmark(<TestHoverCard defaultOpen />);
    expect(stateOf('content')).toBe('open');
    fireEvent.keyDown(partElement(body(), 'trigger') as HTMLElement, { key: 'Escape' });
    expect(stateOf('content')).toBe('closed');
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
  });
});
