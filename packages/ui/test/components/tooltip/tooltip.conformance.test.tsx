/**
 * React performance of the tooltip score, driven end to end.
 *
 * WHAT CHANGED AT #2148, and what this file now proves. The tip is no longer
 * mounted on the open axis and no longer portals to document.body by default:
 * `TooltipRoot` renders a real `<div data-part="root" data-tooltip>` and the
 * trigger and content are DOM SIBLINGS inside it, present at all times. That
 * shape is the CSS contract -- the stylesheet reveals the tip through
 * `[data-tooltip]:hover > [data-part=content]`, so a node that does not exist,
 * or that lives on document.body, could never be revealed at all.
 *
 * So the assertions here are about the score's ATTRIBUTES (data-state,
 * aria-describedby, data-dismissed), not about presence. Whether those
 * attributes and the hover selector actually make the tip visible is the
 * stylesheet's half, pinned by tooltip.classes.test.ts (the class candidates)
 * and test/motion/hover-reveal.e2e.ts (the desugared rules, in a real browser
 * with JavaScript disabled).
 */
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '../../../src/components/tooltip/tooltip';
import { tooltip } from '../../../src/components/tooltip/tooltip.behavior';
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

function TestTooltip({ disableHoverableContent, ...props }: SetupProps) {
  return (
    <TooltipProvider disableHoverableContent={disableHoverableContent}>
      <Tooltip {...props}>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent>More info</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** axe's region best-practice rule flags top-level content, and the tip now
 *  renders in the document rather than in a portal target of the test's
 *  choosing -- so give the whole component a landmark to sit in. */
function renderInLandmark(node: React.ReactElement): void {
  render(<main>{node}</main>);
}

const body = () => document.body;
const stateOf = (part: 'trigger' | 'content') =>
  partElement(body(), part)?.getAttribute('data-state');
const rootEl = () => body().querySelector<HTMLElement>('[data-part="root"][data-tooltip]');

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('tooltip conformance [react]', () => {
  it('the root is a real element with trigger and content as DOM siblings', () => {
    renderInLandmark(<TestTooltip />);
    const root = rootEl();
    expect(root).not.toBeNull();
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    expect(trigger.parentElement).toBe(root);
    expect(content.parentElement).toBe(root);
    // Order matters to the sibling selectors: content follows its trigger.
    expect(trigger.nextElementSibling).toBe(content);
  });

  it('closed: the tip is PRESENT, described, never hidden, and axe-clean', async () => {
    renderInLandmark(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content).not.toBeNull();
    // The description is unconditional: it survives a JS-off page.
    expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(stateOf('trigger')).toBe('closed');
    expect(stateOf('content')).toBe('closed');
    // `hidden` would be display:none -- out of the a11y tree and out of reach
    // of the hover reveal.
    expect(content.hasAttribute('hidden')).toBe(false);
    await assertAxeClean(body());
  });

  it('hover opens: content is role=tooltip and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);

    expect(stateOf('content')).toBe('open');
    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(tooltip, body(), state, config, ['trigger', 'content']);
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content'] as const);
    expect(partElement(body(), 'trigger')?.getAttribute('aria-describedby')).toBe(ids.content);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('tooltip');
  });

  it('keyboard focus opens the tip; the tip itself never takes focus', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <button type="button">before</button>
        <TestTooltip />
      </main>,
    );
    await user.tab(); // before
    await user.tab(); // trigger
    expect(document.activeElement).toBe(partElement(body(), 'trigger'));
    expect(stateOf('content')).toBe('open');
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.tabIndex).toBeLessThan(0);
  });

  it('Escape dismisses: the score closes AND the root raises data-dismissed', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    trigger.focus();
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    await user.keyboard('{Escape}');
    expect(stateOf('content')).toBe('closed');
    // WCAG 1.4.13: the pointer is still over the trigger, so `:hover` still
    // matches -- only the dismissal flag can force the tip back down.
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
  });

  it('leaving the trigger closes the tip and clears any dismissal', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
    await user.unhover(trigger);
    expect(stateOf('content')).toBe('closed');
    // Cleared, so a fresh hover reopens normally.
    expect(rootEl()?.hasAttribute('data-dismissed')).toBe(false);
  });

  it('hoverable content holds the tip open: the root is the hover scope', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(trigger);
    // Moving from trigger to content never leaves the root, so nothing closes
    // and no grace-window timer is needed to bridge the travel.
    await user.hover(content);
    expect(stateOf('content')).toBe('open');
    await user.unhover(content);
    expect(stateOf('content')).toBe('closed');
  });

  it('disableHoverableContent narrows the hover scope to the trigger', async () => {
    const user = userEvent.setup();
    renderInLandmark(<TestTooltip disableHoverableContent />);
    expect(rootEl()?.getAttribute('data-disable-hoverable-content')).toBe('true');
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(stateOf('content')).toBe('open');
    await user.unhover(trigger);
    expect(stateOf('content')).toBe('closed');
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInLandmark(<TestTooltip onOpenChange={onOpenChange} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('explicit Portal composition is the opt-OUT of the sibling contract', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'tip-portal';
    document.body.appendChild(target);
    render(
      <main>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Help</TooltipTrigger>
            <TooltipPortal container={target}>
              <TooltipContent>More info</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </TooltipProvider>
      </main>,
    );
    // Closed, the explicit portal renders nothing: a consumer who reaches for it
    // has taken that instance off the CSS reveal path deliberately.
    expect(target.querySelector('[data-part="content"]')).toBeNull();
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    // The tip renders once, inside the consumer-owned portal target.
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
  });

  it('defaultOpen mounts the tip already shown', () => {
    renderInLandmark(<TestTooltip defaultOpen />);
    expect(stateOf('content')).toBe('open');
    expect(stateOf('trigger')).toBe('open');
  });

  it('Escape dismisses a defaultOpen tip that never received a hover/focus event', () => {
    // Regression: dismissal routed only through the retired hover primitive left
    // a defaultOpen tip open, because no prior hover/focus had given it any
    // state to close. fireEvent (not user.keyboard) reproduces it: a raw Escape
    // keydown with no focus event first.
    renderInLandmark(<TestTooltip defaultOpen />);
    expect(stateOf('content')).toBe('open');
    fireEvent.keyDown(partElement(body(), 'trigger') as HTMLElement, { key: 'Escape' });
    expect(stateOf('content')).toBe('closed');
    expect(rootEl()?.getAttribute('data-dismissed')).toBe('true');
  });
});
