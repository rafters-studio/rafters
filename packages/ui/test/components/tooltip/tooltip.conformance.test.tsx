/**
 * React performance of the tooltip score, driven end to end. The content
 * portals into document.body, so part queries run against body, not the RTL
 * container. Delays are zeroed so hover/focus intent resolves synchronously.
 */
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
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
  skipDelayDuration?: number;
  /** Portal the tip into a landmark so axe's region rule is satisfied. */
  container?: HTMLElement | null;
}

function TestTooltip({
  disableHoverableContent,
  skipDelayDuration = 0,
  container,
  ...props
}: SetupProps) {
  return (
    <TooltipProvider
      delayDuration={0}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <Tooltip {...props}>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent container={container}>More info</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const body = () => document.body;

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  resetHoverDelayState();
});

describe('tooltip conformance [react]', () => {
  it('closed: only the trigger renders, undescribed and axe-clean', async () => {
    render(<TestTooltip />);
    const trigger = partElement(body(), 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(body(), 'content')).toBeNull();
    expect(trigger?.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger?.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger?.getAttribute('data-state')).toBe('closed');
    await assertAxeClean(body());
  });

  it('hover opens: content is role=tooltip and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    // Portal the tip into a landmark: axe's region best-practice rule flags
    // top-level content, and a portaled overlay would otherwise land on body.
    const main = document.createElement('main');
    document.body.appendChild(main);
    render(<TestTooltip container={main} />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);

    expect(partElement(body(), 'content')).not.toBeNull();
    const config = { defaultOpen: false };
    const state = { open: true };
    assertContractFulfillment(tooltip, body(), state, config, ['trigger', 'content']);
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    render(<TestTooltip />);
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    const ids = domPartIds(body(), ['trigger', 'content'] as const);
    expect(partElement(body(), 'trigger')?.getAttribute('aria-describedby')).toBe(ids.content);
    expect(partElement(body(), 'content')?.getAttribute('role')).toBe('tooltip');
  });

  it('keyboard focus opens the tip; the tip itself never takes focus', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">before</button>
        <TestTooltip />
      </div>,
    );
    await user.tab(); // before
    await user.tab(); // trigger
    expect(document.activeElement).toBe(partElement(body(), 'trigger'));
    expect(partElement(body(), 'content')).not.toBeNull();
    const content = partElement(body(), 'content') as HTMLElement;
    expect(content.tabIndex).toBeLessThan(0);
  });

  it('Escape dismisses while focused', async () => {
    const user = userEvent.setup();
    render(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    trigger.focus();
    await user.hover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('leaving the trigger closes the tip', async () => {
    const user = userEvent.setup();
    render(<TestTooltip />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.unhover(trigger);
    expect(partElement(body(), 'content')).toBeNull();
  });

  it('hoverable content holds the tip open until the pointer leaves it', async () => {
    const user = userEvent.setup();
    // A positive close delay is the grace window that lets the pointer cross
    // the gap from trigger to content without the tip vanishing mid-travel.
    render(<TestTooltip skipDelayDuration={50} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    const content = partElement(body(), 'content') as HTMLElement;
    await user.hover(content); // leaves trigger, enters content within the grace window
    await user.unhover(trigger);
    expect(partElement(body(), 'content')).not.toBeNull();
    await user.unhover(content);
    await waitFor(() => expect(partElement(body(), 'content')).toBeNull());
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestTooltip onOpenChange={onOpenChange} />);
    const trigger = partElement(body(), 'trigger') as HTMLElement;
    await user.hover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.unhover(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('explicit Portal composition renders the tip without an automatic wrapper', async () => {
    const user = userEvent.setup();
    const target = document.createElement('div');
    target.id = 'tip-portal';
    document.body.appendChild(target);
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Help</TooltipTrigger>
          <TooltipPortal container={target}>
            <TooltipContent>More info</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(partElement(body(), 'trigger') as HTMLElement);
    // The tip renders once, inside the consumer-owned portal target.
    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
  });

  it('defaultOpen mounts the tip already shown', () => {
    render(<TestTooltip defaultOpen />);
    expect(partElement(body(), 'content')).not.toBeNull();
    expect(partElement(body(), 'trigger')?.getAttribute('data-state')).toBe('open');
  });
});
