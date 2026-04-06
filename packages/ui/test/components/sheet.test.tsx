/**
 * Sheet component tests
 * Tests SSR, hydration, interactions, and slide-in behavior
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from '../../src/components/ui/sheet';

describe('Sheet - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Sheet open>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
            <SheetClose>Close</SheetClose>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open'); // Trigger should render
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <Sheet open>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetTitle>Server Content</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('Sheet - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <Sheet open>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetTitle>Hydrated Content</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Rerender should maintain open state
    rerender(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});

describe('Sheet - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    // Initially closed
    expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open Sheet'));

    // Should open
    await waitFor(() => {
      expect(screen.getByText('Sheet Title')).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetClose data-testid="custom-close">Close</SheetClose>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('Sheet Title')).toBeInTheDocument();
    });

    // Click close
    await user.click(screen.getByTestId('custom-close'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sheet Title')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
    });
  });

  it('should close when clicking outside (modal mode)', async () => {
    render(
      <Sheet defaultOpen modal>
        <SheetPortal>
          <SheetOverlay data-testid="overlay" />
          <SheetContent>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sheet Title')).toBeInTheDocument();
    });

    // Click overlay
    const overlay = screen.getByTestId('overlay');
    fireEvent.pointerDown(overlay);

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument();
    });
  });
});

describe('Sheet - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledSheet = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Sheet
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <SheetTrigger>Open</SheetTrigger>
          <SheetPortal>
            <SheetContent>
              <SheetTitle>Controlled</SheetTitle>
              <SheetClose data-testid="custom-close">Close</SheetClose>
            </SheetContent>
          </SheetPortal>
        </Sheet>
      );
    };

    render(<ControlledSheet />);

    // Initially closed
    expect(screen.queryByText('Controlled')).not.toBeInTheDocument();

    // Open
    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Controlled')).toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    // Close
    await user.click(screen.getByTestId('custom-close'));

    await waitFor(() => {
      expect(screen.queryByText('Controlled')).not.toBeInTheDocument();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('Sheet - Side Variants', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render with right side by default', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent data-testid="sheet-content">
            <SheetTitle>Right Sheet</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('sheet-content');
      expect(content).toHaveClass('right-0');
      expect(content).toHaveClass('inset-y-0');
    });
  });

  it('should render with left side', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent side="left" data-testid="sheet-content">
            <SheetTitle>Left Sheet</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('sheet-content');
      expect(content).toHaveClass('left-0');
      expect(content).toHaveClass('inset-y-0');
    });
  });

  it('should render with top side', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent side="top" data-testid="sheet-content">
            <SheetTitle>Top Sheet</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('sheet-content');
      expect(content).toHaveClass('top-0');
      expect(content).toHaveClass('inset-x-0');
    });
  });

  it('should render with bottom side', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent side="bottom" data-testid="sheet-content">
            <SheetTitle>Bottom Sheet</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('sheet-content');
      expect(content).toHaveClass('bottom-0');
      expect(content).toHaveClass('inset-x-0');
    });
  });
});

describe('Sheet - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have correct ARIA attributes', async () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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

describe('Sheet - Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should trap focus inside sheet', async () => {
    const user = userEvent.setup();

    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Focus Trap</SheetTitle>
            <button type="button">First</button>
            <button type="button">Second</button>
            <SheetClose data-testid="last-button">Last</SheetClose>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByText('Focus Trap')).toBeInTheDocument();
    });

    // Focus trap automatically focuses first focusable element in sheet
    // Note: The close button is rendered AFTER children, so "First" is the first focusable element
    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    // Tab through elements
    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('last-button')).toHaveFocus();

    // Tab again - should go to built-in close button, then wrap back to first
    await user.tab(); // Close button
    await user.tab(); // Should wrap back to First

    expect(screen.getByText('First')).toHaveFocus();
  });
});

describe('Sheet - Body Scroll Lock', () => {
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
      <Sheet defaultOpen modal>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Scroll Lock</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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

describe('Sheet - Form Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work with form inside sheet', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const SheetWithForm = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>Open Form</SheetTrigger>
          <SheetPortal>
            <SheetContent>
              <SheetTitle>Form Sheet</SheetTitle>
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
            </SheetContent>
          </SheetPortal>
        </Sheet>
      );
    };

    render(<SheetWithForm />);

    // Open sheet
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
      expect(screen.queryByText('Form Sheet')).not.toBeInTheDocument();
    });
  });
});

describe('Sheet - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger asChild>
          <a href="#open">Custom Trigger</a>
        </SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Opened</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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

describe('Sheet - Header and Footer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render SheetHeader with correct layout classes', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetHeader data-testid="header">
              <SheetTitle>Title</SheetTitle>
              <SheetDescription>Description</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col');
    });
  });

  it('should render SheetFooter with correct layout classes', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter data-testid="footer">
              <button type="button">Cancel</button>
              <button type="button">Save</button>
            </SheetFooter>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'flex-col-reverse');
    });
  });

  it('should allow custom className on Header and Footer', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetHeader className="custom-header" data-testid="header">
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
            <SheetFooter className="custom-footer" data-testid="footer">
              <button type="button">Action</button>
            </SheetFooter>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });
});

describe('Sheet - Title and Description styling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should apply default styles to SheetTitle', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle data-testid="title">Styled Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-title-medium');
    });
  });

  it('should apply default styles to SheetDescription', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription data-testid="description">Styled Description</SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('text-body-small');
    });
  });

  it('should allow custom className on Title and Description', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle className="custom-title" data-testid="title">
              Title
            </SheetTitle>
            <SheetDescription className="custom-desc" data-testid="description">
              Description
            </SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
      expect(screen.getByTestId('description')).toHaveClass('custom-desc');
    });
  });
});
