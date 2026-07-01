/**
 * AlertDialog component accessibility tests
 * Tests ARIA attributes, focus management, and keyboard navigation
 * Key focus: role="alertdialog" and focus defaulting to cancel button
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
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
} from '../../../src/old/ui/alert-dialog';

describe('AlertDialog - Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <AlertDialog>
        <AlertDialogTrigger>Open AlertDialog</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="alertdialog"', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('has aria-modal="true"', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Modal AlertDialog</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('has aria-labelledby pointing to title', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>My Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      const titleId = alertDialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();

      const title = document.getElementById(titleId as string);
      expect(title).toHaveTextContent('My Title');
    });
  });

  it('has aria-describedby pointing to description', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>My description text</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      const descriptionId = alertDialog.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();

      const description = document.getElementById(descriptionId as string);
      expect(description).toHaveTextContent('My description text');
    });
  });

  it('trigger has correct aria-expanded attribute', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open alert dialog
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger has aria-haspopup="dialog"', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-controls pointing to alert dialog content', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    await user.click(trigger);

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('id', controlsId);
    });
  });

  it('focuses cancel button when opened (safer default)', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
  });

  it('traps focus within alert dialog', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Focus Trap Test</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    // Tab to confirm
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    // Tab should wrap to cancel
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('supports Shift+Tab for reverse focus navigation', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Reverse Navigation Test</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    // Shift+Tab should wrap to confirm
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Escape Test</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('returns focus to trigger on close', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Focus Return Test</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('has data-state attribute for open/closed states', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>State Test</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('data-state', 'open');
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });

  it('overlay has aria-hidden="true"', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogOverlay data-testid="overlay" />
          <AlertDialogContent>
            <AlertDialogTitle>Overlay Test</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const overlay = screen.getByTestId('overlay');
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('action and cancel buttons are accessible', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Accessible Buttons</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel this action</AlertDialogCancel>
              <AlertDialogAction>Confirm deletion</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      // Both buttons should be findable by accessible name
      expect(screen.getByRole('button', { name: 'Cancel this action' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeInTheDocument();
    });
  });

  it('does not close on outside click (intentional for alert dialogs)', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogOverlay data-testid="overlay" />
          <AlertDialogContent>
            <AlertDialogTitle>Cannot Close Outside</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Simulate clicking outside by clicking the overlay
    const overlay = screen.getByTestId('overlay');
    overlay.click();

    // Alert dialog should still be open - this is intentional behavior
    // Users must explicitly choose an action
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('maintains focus order with multiple interactive elements', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Multi Element Focus</AlertDialogTitle>
            <AlertDialogDescription>Please review before continuing.</AlertDialogDescription>
            <input type="checkbox" aria-label="I understand" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    // Should focus cancel first (safer choice)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    // Tab through all elements
    await user.tab();
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'I understand' })).toHaveFocus();

    // Tab should wrap back to cancel
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
