/**
 * Dialog component tests
 * Tests SSR, hydration, interactions, and React Hook Form integration
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../../src/components/ui/dialog';

describe('Dialog - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open'); // Trigger should render
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Server Content</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('Dialog - Client Hydration', () => {
  beforeEach(() => {
    // Clean up document.body
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Hydrated Content</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Rerender should maintain open state
    rerender(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});

describe('Dialog - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    // Initially closed
    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open Dialog'));

    // Should open
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    // Click close
    await user.click(screen.getByText('Close'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });
  });

  it('should close when clicking outside (modal mode)', async () => {
    const _user = userEvent.setup();

    render(
      <Dialog defaultOpen modal>
        <DialogPortal>
          <DialogOverlay data-testid="overlay" />
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    });

    // Click overlay
    const overlay = screen.getByTestId('overlay');
    fireEvent.pointerDown(overlay);

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });
  });
});

describe('Dialog - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledDialog = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Dialog
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <DialogTrigger>Open</DialogTrigger>
          <DialogPortal>
            <DialogContent>
              <DialogTitle>Controlled</DialogTitle>
              <DialogClose>Close</DialogClose>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      );
    };

    render(<ControlledDialog />);

    // Initially closed
    expect(screen.queryByText('Controlled')).not.toBeInTheDocument();

    // Open
    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Controlled')).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    // Close
    await user.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByText('Controlled')).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('controlled prop drives open; cell does not self-open (disclosure delegation)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Body</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await user.click(screen.getByText('Open'));

    // Callback fired, but the cell did NOT self-open while controlled.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();

    // The owning prop reflects in.
    rerender(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Body</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Body')).toBeInTheDocument();
    });
  });
});

describe('Dialog - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have correct ARIA attributes', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });

    const trigger = screen.getByText('Open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });
});

describe('Dialog - Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should trap focus inside dialog', async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Focus Trap</DialogTitle>
            <button type="button">First</button>
            <button type="button">Second</button>
            <DialogClose>Last</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByText('Focus Trap')).toBeInTheDocument();
    });

    // Focus trap automatically focuses first element
    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    // Tab to next element
    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();

    await user.tab();
    expect(screen.getByText('Last')).toHaveFocus();

    // Tab should wrap to first element
    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();

    // Shift+Tab should go backwards
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByText('Last')).toHaveFocus();
  });
});

describe('Dialog - Body Scroll Lock', () => {
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
      <Dialog defaultOpen modal>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Scroll Lock</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
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

describe('Dialog - React Hook Form Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work with form inside dialog', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const DialogWithForm = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>Open Form</DialogTrigger>
          <DialogPortal>
            <DialogContent>
              <DialogTitle>Form Dialog</DialogTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onSubmit(Object.fromEntries(formData));
                  setOpen(false);
                }}
              >
                <input name="username" placeholder="Username" />
                <input name="email" type="email" placeholder="Email" />
                <button type="submit">Submit</button>
              </form>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      );
    };

    render(<DialogWithForm />);

    // Open dialog
    await user.click(screen.getByText('Open Form'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    });

    // Fill form
    await user.type(screen.getByPlaceholderText('Username'), 'testuser');
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');

    // Submit
    await user.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(screen.queryByText('Form Dialog')).not.toBeInTheDocument();
    });
  });

  it('should not close on Enter key inside form input', async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Form</DialogTitle>
            <form>
              <input name="field" placeholder="Type here" />
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type here');
    await user.click(input);
    await user.keyboard('test{Enter}');

    // Dialog should still be open
    expect(screen.getByText('Form')).toBeInTheDocument();
  });
});

describe('Dialog - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <a href="#open">Custom Trigger</a>
        </DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>Opened</DialogTitle>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    const trigger = screen.getByText('Custom Trigger');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#open');

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Opened')).toBeInTheDocument();
    });
  });
});
