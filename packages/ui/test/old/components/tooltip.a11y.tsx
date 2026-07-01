/**
 * Tooltip component accessibility tests
 * Tests ARIA attributes, keyboard navigation, and screen reader support
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  resetTooltipState,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '../../../src/old/ui/tooltip';

describe('Tooltip - Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetTooltipState();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover for info</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Helpful information</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover for info</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Helpful information</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="tooltip" on content', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip content</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Tooltip content');
    });
  });

  it('links trigger to tooltip with aria-describedby when open', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Described trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Description text</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const trigger = screen.getByText('Described trigger');
      const tooltip = screen.getByRole('tooltip');

      const describedById = trigger.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      expect(tooltip).toHaveAttribute('id', describedById);
    });
  });

  it('removes aria-describedby when tooltip closes', async () => {
    const TestComponent = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <TooltipProvider>
          <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Tooltip</TooltipContent>
            </TooltipPortal>
          </Tooltip>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </TooltipProvider>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    const trigger = screen.getByText('Trigger');
    expect(trigger).toHaveAttribute('aria-describedby');

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(trigger).not.toHaveAttribute('aria-describedby');
    });
  });

  it('shows tooltip on keyboard focus', async () => {
    vi.useFakeTimers();

    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Focusable trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Keyboard accessible</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Focusable trigger');

    // Initially no tooltip
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Focus the trigger
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Keyboard accessible')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides tooltip on blur', async () => {
    vi.useFakeTimers();

    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Focusable trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Keyboard accessible</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Focusable trigger');

    // Focus to show
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Blur to hide
    fireEvent.blur(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('trigger has correct data-state attribute', async () => {
    vi.useFakeTimers();

    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>State trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('State trigger');

    // Initially closed
    expect(trigger).toHaveAttribute('data-state', 'closed');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(trigger).toHaveAttribute('data-state', 'open');

    vi.useRealTimers();
  });

  it('content has correct data-state attribute', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Content with state</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('data-state', 'open');
    });
  });

  it('supports screen reader announcements via role="tooltip"', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Button with help</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>This button does something important</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      // Screen readers will announce the tooltip content when the trigger is focused
      // because of the aria-describedby relationship
      const trigger = screen.getByText('Button with help');
      const tooltip = screen.getByRole('tooltip');

      expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
      expect(tooltip).toHaveTextContent('This button does something important');
    });
  });

  it('trigger remains focusable', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Focusable</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Focusable');

    // Button should be focusable by default
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).not.toHaveAttribute('tabindex', '-1');
  });

  it('asChild trigger maintains focusability', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href="#help">Help link</a>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Click for help</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Help link');

    // Link should be focusable
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#help');
  });

  it('works with tab navigation', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delayDuration={0}>
        <button type="button">Before</button>
        <Tooltip>
          <TooltipTrigger>Tooltip trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip content</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <button type="button">After</button>
      </TooltipProvider>,
    );

    const beforeButton = screen.getByText('Before');
    const trigger = screen.getByText('Tooltip trigger');
    const afterButton = screen.getByText('After');

    // Start at before button
    beforeButton.focus();
    expect(beforeButton).toHaveFocus();

    // Tab to tooltip trigger
    await user.tab();
    expect(trigger).toHaveFocus();

    // Tooltip should appear on focus
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    // Tab to after button (tooltip should close)
    await user.tab();
    expect(afterButton).toHaveFocus();

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('has data-side and data-align for CSS styling hooks', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" align="start">
              Positioned tooltip
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('data-side');
      expect(tooltip).toHaveAttribute('data-align');
    });
  });

  it('content is hidden from tab order', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              Non-interactive content
              <span>Just text here</span>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      // Tooltip content should not have any focusable elements by default
      const focusableElements = tooltip.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      expect(focusableElements.length).toBe(0);
    });
  });
});
