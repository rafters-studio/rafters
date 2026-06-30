/**
 * AlertDialog component tests
 * Tests SSR, hydration, interactions, and key differences from Dialog
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
} from '../../src/components/ui/alert-dialog';

describe('AlertDialog - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <AlertDialog open>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open'); // Trigger should render
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <AlertDialog open>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Server Content</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('AlertDialog - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <AlertDialog open>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Hydrated Content</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Rerender should maintain open state
    rerender(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});

describe('AlertDialog - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open AlertDialog</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>AlertDialog Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    // Initially closed
    expect(screen.queryByText('AlertDialog Title')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open AlertDialog'));

    // Should open
    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });
  });

  it('should close when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>AlertDialog Title</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });

    // Click cancel
    await user.click(screen.getByText('Cancel'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('AlertDialog Title')).not.toBeInTheDocument();
    });
  });

  it('should close when action button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>AlertDialog Title</AlertDialogTitle>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });

    // Click action
    await user.click(screen.getByText('Continue'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('AlertDialog Title')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>AlertDialog Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('AlertDialog Title')).not.toBeInTheDocument();
    });
  });

  it('should NOT close when clicking outside (unlike Dialog)', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogOverlay data-testid="overlay" />
          <AlertDialogContent>
            <AlertDialogTitle>AlertDialog Title</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });

    // Click overlay - should NOT close (key difference from Dialog)
    const overlay = screen.getByTestId('overlay');
    fireEvent.pointerDown(overlay);

    // Should still be open
    await waitFor(() => {
      expect(screen.getByText('AlertDialog Title')).toBeInTheDocument();
    });
  });
});

describe('AlertDialog - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledAlertDialog = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <AlertDialog
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogPortal>
            <AlertDialogContent>
              <AlertDialogTitle>Controlled</AlertDialogTitle>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      );
    };

    render(<ControlledAlertDialog />);

    // Initially closed
    expect(screen.queryByText('Controlled')).not.toBeInTheDocument();

    // Open
    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Controlled')).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    // Cancel
    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Controlled')).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('controlled prop drives open; cell does not self-open (disclosure delegation)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <AlertDialog open={false} onOpenChange={onOpenChange}>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Body</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    // Callback fired, but the cell did NOT self-open while controlled.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();

    // The owning prop reflects in.
    rerender(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Body</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Body')).toBeInTheDocument();
    });
  });
});

describe('AlertDialog - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have role="alertdialog" (not role="dialog")', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Description</AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toBeInTheDocument();
      expect(alertDialog).toHaveAttribute('aria-modal', 'true');
      expect(alertDialog).toHaveAttribute('aria-labelledby');
      expect(alertDialog).toHaveAttribute('aria-describedby');
      expect(alertDialog).toHaveAttribute('data-state', 'open');
    });

    const trigger = screen.getByText('Open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('should have aria-labelledby pointing to title', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>My Alert Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const alertDialog = screen.getByRole('alertdialog');
      const titleId = alertDialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();

      const title = document.getElementById(titleId as string);
      expect(title).toHaveTextContent('My Alert Title');
    });
  });

  it('should have aria-describedby pointing to description', async () => {
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
});

describe('AlertDialog - Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should focus cancel button by default (safer choice)', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Focus Test</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toHaveFocus();
    });
  });

  it('should trap focus inside alert dialog', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Focus Trap</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Focus Trap')).toBeInTheDocument();
    });

    // Wait for focus to settle on cancel button
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toHaveFocus();
    });

    // Tab to confirm button
    await user.tab();
    expect(screen.getByText('Confirm')).toHaveFocus();

    // Tab should wrap to cancel
    await user.tab();
    expect(screen.getByText('Cancel')).toHaveFocus();

    // Shift+Tab should go to confirm
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByText('Confirm')).toHaveFocus();
  });

  it('should focus first focusable if no cancel button', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>No Cancel</AlertDialogTitle>
            <button type="button">First Button</button>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('First Button')).toHaveFocus();
    });
  });
});

describe('AlertDialog - Body Scroll Lock', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('should lock body scroll when open', async () => {
    const { rerender } = render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Scroll Lock</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Scroll Lock')).toBeInTheDocument();
    });

    // Body scroll should be locked
    expect(document.body.style.overflow).toBe('hidden');

    // Unmount
    rerender(<div />);

    // Scroll should be restored
    await waitFor(() => {
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });
});

describe('AlertDialog - Action and Cancel Callbacks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should call onClick on action button before closing', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onAction}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete'));

    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
    });
  });

  it('should call onClick on cancel button before closing', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
    });
  });
});

describe('AlertDialog - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <a href="#delete">Delete Item</a>
        </AlertDialogTrigger>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    const trigger = screen.getByText('Delete Item');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#delete');

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });
  });
});

describe('AlertDialog - Header and Footer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render AlertDialogHeader with correct layout classes', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogHeader data-testid="header">
              <AlertDialogTitle>Title</AlertDialogTitle>
              <AlertDialogDescription>Description</AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col');
    });
  });

  it('should render AlertDialogFooter with correct layout classes', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogFooter data-testid="footer">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'flex-col-reverse');
    });
  });

  it('should allow custom className on Header and Footer', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogHeader className="custom-header" data-testid="header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="custom-footer" data-testid="footer">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });
});

describe('AlertDialog - Button Styling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have destructive styling on action button', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogAction data-testid="action">Delete</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const action = screen.getByTestId('action');
      expect(action).toHaveClass('bg-destructive');
    });
  });

  it('should have outline/secondary styling on cancel button', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogCancel data-testid="cancel">Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      const cancel = screen.getByTestId('cancel');
      expect(cancel).toHaveClass('border', 'border-input', 'bg-background');
    });
  });
});

describe('AlertDialog - Escape Key Prevention', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support onEscapeKeyDown callback', async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent onEscapeKeyDown={onEscape}>
            <AlertDialogTitle>Escape Test</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Escape Test')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should allow preventing escape close via event.preventDefault', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogPortal>
          <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
            <AlertDialogTitle>Cannot Escape</AlertDialogTitle>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Cannot Escape')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // Should still be open because we prevented default
    expect(screen.getByText('Cannot Escape')).toBeInTheDocument();
  });
});

describe('AlertDialog - shadcn Drop-in Replacement (no explicit Portal/Overlay)', () => {
  beforeEach(() => {
    document.body.textContent = '';
  });

  it('should work without explicit AlertDialogPortal and AlertDialogOverlay', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Initially closed
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();

    // Click trigger to open
    await user.click(screen.getByText('Open'));

    // Should open with Portal and Overlay automatically
    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Overlay should be present (check for the backdrop)
    const overlays = document.querySelectorAll('[data-state="open"][aria-hidden="true"]');
    expect(overlays.length).toBeGreaterThan(0);

    // Click cancel to close
    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });
  });

  it('should NOT have a close X button (unlike Dialog)', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // There should NOT be a close button with aria-label="Close"
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('should have correct default styles on content', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent data-testid="content">
          <AlertDialogTitle>Styled Content</AlertDialogTitle>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('relative', 'grid', 'w-full', 'max-w-lg');
    });
  });

  it('should work with defaultOpen and auto Portal/Overlay', async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Default Open Test</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Default Open Test')).toBeInTheDocument();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  it('should close on escape key in shadcn style', async () => {
    const user = userEvent.setup();

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escape Test</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Press escape to close
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
