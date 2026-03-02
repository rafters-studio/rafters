/**
 * HoverCard component accessibility tests
 * Tests ARIA attributes, keyboard navigation, and screen reader support
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
  resetHoverCardState,
} from '../../src/components/ui/hover-card';

describe('HoverCard - Accessibility', () => {
  beforeEach(() => {
    cleanup();
    resetHoverCardState();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <HoverCard>
        <HoverCardTrigger>@johndoe</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>User profile information</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <HoverCard open>
        <HoverCardTrigger>@johndoe</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>User profile information</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="dialog" on content', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Hover card content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent('Hover card content');
    });
  });

  it('links trigger to hover card with aria-describedby when open', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Described trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Description text</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const trigger = screen.getByText('Described trigger');
      const dialog = screen.getByRole('dialog');

      const describedById = trigger.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      expect(dialog).toHaveAttribute('id', describedById);
    });
  });

  it('removes aria-describedby when hover card closes', async () => {
    const TestComponent = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <HoverCard open={open} onOpenChange={setOpen}>
          <HoverCardTrigger>Trigger</HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent>Content</HoverCardContent>
          </HoverCardPortal>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </HoverCard>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const trigger = screen.getByText('Trigger');
    expect(trigger).toHaveAttribute('aria-describedby');

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(trigger).not.toHaveAttribute('aria-describedby');
    });
  });

  it('shows hover card on keyboard focus', async () => {
    vi.useFakeTimers();

    render(
      <HoverCard openDelay={0}>
        <HoverCardTrigger>Focusable trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Keyboard accessible</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Focusable trigger');

    // Initially no hover card
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Focus the trigger
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard accessible')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides hover card on blur', async () => {
    vi.useFakeTimers();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>Focusable trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Keyboard accessible</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Focusable trigger');

    // Focus to show
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Blur to hide
    fireEvent.blur(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('trigger has correct data-state attribute', async () => {
    vi.useFakeTimers();

    render(
      <HoverCard openDelay={0}>
        <HoverCardTrigger>State trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
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
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content with state</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });
  });

  it('supports screen reader announcements via role="dialog"', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>User link with preview</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>This user is a software engineer at Acme Corp</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      // Screen readers will announce the dialog content when the trigger is focused
      // because of the aria-describedby relationship
      const trigger = screen.getByText('User link with preview');
      const dialog = screen.getByRole('dialog');

      expect(trigger.getAttribute('aria-describedby')).toBe(dialog.id);
      expect(dialog).toHaveTextContent('This user is a software engineer at Acme Corp');
    });
  });

  it('trigger remains focusable', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Focusable</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Focusable');

    // Anchor should be focusable by default
    expect(trigger.tagName).toBe('A');
    expect(trigger).not.toHaveAttribute('tabindex', '-1');
  });

  it('asChild trigger maintains focusability', () => {
    render(
      <HoverCard>
        <HoverCardTrigger asChild>
          <a href="/profile">Profile link</a>
        </HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>User profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Profile link');

    // Link should be focusable
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '/profile');
  });

  it('has data-side and data-align for CSS styling hooks', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent side="bottom" align="start">
            Positioned hover card
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-side');
      expect(dialog).toHaveAttribute('data-align');
    });
  });

  it('content does not trap focus like modal dialogs', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>
            Non-modal content
            <button type="button">Inside button</button>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      // HoverCard should not have aria-modal since it's non-modal
      expect(dialog).not.toHaveAttribute('aria-modal', 'true');
    });
  });

  it('calls onOpenChange with false on Escape key press', async () => {
    vi.useFakeTimers();

    const handleOpenChange = vi.fn();

    render(
      <HoverCard openDelay={0} closeDelay={0} onOpenChange={handleOpenChange}>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Trigger');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);

    vi.useRealTimers();
  });

  it('removes dialog from DOM on Escape in uncontrolled mode', async () => {
    vi.useFakeTimers();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Trigger');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not close when onEscapeKeyDown calls preventDefault', async () => {
    vi.useFakeTimers();

    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent onEscapeKeyDown={(e) => e.preventDefault()}>
            Content
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Trigger');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape - should be intercepted
    fireEvent.keyDown(document, { key: 'Escape' });

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Should remain open because preventDefault was called
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hover card content is semantically linked to trigger', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger data-testid="trigger">@username</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent data-testid="content">Profile information</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const trigger = screen.getByTestId('trigger');
      const content = screen.getByTestId('content');

      // Trigger should reference content
      const describedBy = trigger.getAttribute('aria-describedby');
      expect(describedBy).toBe(content.id);
    });
  });
});
