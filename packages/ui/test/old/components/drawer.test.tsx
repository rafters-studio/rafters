/**
 * Drawer component tests
 * Tests SSR, hydration, interactions, touch gestures, and side variants
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from '../../../src/old/ui/drawer';

describe('Drawer - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Drawer open>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
            <DrawerClose>Close</DrawerClose>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open'); // Trigger should render
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <Drawer open>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Server Content</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('Drawer - Client Hydration', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <Drawer open>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerTitle>Hydrated Content</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <Drawer defaultOpen>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Rerender should maintain open state
    rerender(
      <Drawer defaultOpen>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});

describe('Drawer - Basic Interactions', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open Drawer</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Drawer Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    // Initially closed
    expect(screen.queryByText('Drawer Title')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open Drawer'));

    // Should open
    await waitFor(() => {
      expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerClose data-testid="custom-close">Close</DrawerClose>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    });

    // Click close
    await user.click(screen.getByTestId('custom-close'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Drawer Title')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Drawer Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Drawer Title')).not.toBeInTheDocument();
    });
  });

  it('should close when clicking outside (modal mode)', async () => {
    render(
      <Drawer defaultOpen modal>
        <DrawerPortal>
          <DrawerOverlay data-testid="overlay" />
          <DrawerContent>
            <DrawerTitle>Drawer Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    });

    // Click overlay
    const overlay = screen.getByTestId('overlay');
    fireEvent.pointerDown(overlay);

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Drawer Title')).not.toBeInTheDocument();
    });
  });
});

describe('Drawer - Controlled Mode', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledDrawer = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Drawer
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <DrawerTrigger>Open</DrawerTrigger>
          <DrawerPortal>
            <DrawerContent>
              <DrawerTitle>Controlled</DrawerTitle>
              <DrawerClose data-testid="custom-close">Close</DrawerClose>
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      );
    };

    render(<ControlledDrawer />);

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

  it('controlled prop drives open; cell does not self-open (disclosure delegation)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <Drawer open={false} onOpenChange={onOpenChange}>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Body</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await user.click(screen.getByText('Open'));

    // Callback fired, but the cell did NOT self-open while controlled.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Body')).not.toBeInTheDocument();

    // The owning prop reflects in.
    rerender(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Body</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Body')).toBeInTheDocument();
    });
  });
});

describe('Drawer - Side Variants', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render with bottom side by default', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Bottom Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      expect(content).toHaveClass('bottom-0');
      expect(content).toHaveClass('inset-x-0');
    });
  });

  it('should render with top side', async () => {
    render(
      <Drawer defaultOpen side="top">
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Top Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      expect(content).toHaveClass('top-0');
      expect(content).toHaveClass('inset-x-0');
    });
  });

  it('should render with left side', async () => {
    render(
      <Drawer defaultOpen side="left">
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Left Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      expect(content).toHaveClass('left-0');
      expect(content).toHaveClass('inset-y-0');
    });
  });

  it('should render with right side', async () => {
    render(
      <Drawer defaultOpen side="right">
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Right Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      expect(content).toHaveClass('right-0');
      expect(content).toHaveClass('inset-y-0');
    });
  });
});

describe('Drawer - Touch Gestures', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render drag handle by default', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Drag Handle</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const handle = document.querySelector('[data-drawer-handle]');
      expect(handle).toBeInTheDocument();
    });
  });

  it('should not render drag handle when draggable is false', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent draggable={false} data-testid="drawer-content">
            <DrawerTitle>No Drag Handle</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('No Drag Handle')).toBeInTheDocument();
    });

    const handle = document.querySelector('[data-drawer-handle]');
    expect(handle).not.toBeInTheDocument();
  });

  it('should handle touch drag to dismiss on bottom drawer', async () => {
    const onOpenChange = vi.fn();

    render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content" dismissThreshold={50}>
            <DrawerTitle>Touch Drag</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Touch Drag')).toBeInTheDocument();
    });

    const content = screen.getByTestId('drawer-content');

    // Simulate touch drag down (beyond threshold)
    fireEvent.touchStart(content, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(content, {
      touches: [{ clientX: 100, clientY: 200 }],
    });

    fireEvent.touchEnd(content);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should not dismiss when drag is below threshold', async () => {
    const onOpenChange = vi.fn();

    render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content" dismissThreshold={100}>
            <DrawerTitle>Touch Drag</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Touch Drag')).toBeInTheDocument();
    });

    const content = screen.getByTestId('drawer-content');

    // Simulate small touch drag (below threshold)
    fireEvent.touchStart(content, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(content, {
      touches: [{ clientX: 100, clientY: 130 }],
    });

    fireEvent.touchEnd(content);

    // Should not close
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('Drawer - ARIA Attributes', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should have correct ARIA attributes', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
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

describe('Drawer - Focus Management', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should trap focus inside drawer', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent showCloseButton={false} draggable={false}>
            <DrawerTitle>Focus Trap</DrawerTitle>
            <button type="button">First</button>
            <button type="button">Second</button>
            <DrawerClose data-testid="last-button">Last</DrawerClose>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Focus Trap')).toBeInTheDocument();
    });

    // Focus trap automatically focuses first focusable element
    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });

    // Tab through elements
    await user.tab();
    expect(screen.getByText('Second')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('last-button')).toHaveFocus();

    // Tab should wrap back to first
    await user.tab();
    expect(screen.getByText('First')).toHaveFocus();
  });
});

describe('Drawer - Body Scroll Lock', () => {
  beforeEach(() => {
    cleanup();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('should lock body scroll when open', async () => {
    const { rerender } = render(
      <Drawer defaultOpen modal>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Scroll Lock</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
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

describe('Drawer - Form Integration', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should work with form inside drawer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const DrawerWithForm = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger>Open Form</DrawerTrigger>
          <DrawerPortal>
            <DrawerContent>
              <DrawerTitle>Form Drawer</DrawerTitle>
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
            </DrawerContent>
          </DrawerPortal>
        </Drawer>
      );
    };

    render(<DrawerWithForm />);

    // Open drawer
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
      expect(screen.queryByText('Form Drawer')).not.toBeInTheDocument();
    });
  });
});

describe('Drawer - asChild Pattern', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger asChild>
          <a href="#open">Custom Trigger</a>
        </DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Opened</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByText('Custom Trigger');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#open');

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Opened')).toBeInTheDocument();
    });
  });

  it('should support asChild on close', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerClose asChild>
              <a href="#close">Custom Close</a>
            </DrawerClose>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    const closeLink = screen.getByText('Custom Close');
    expect(closeLink.tagName).toBe('A');

    await user.click(closeLink);

    await waitFor(() => {
      expect(screen.queryByText('Title')).not.toBeInTheDocument();
    });
  });
});

describe('Drawer - Header and Footer', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render DrawerHeader with correct layout classes', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerHeader data-testid="header">
              <DrawerTitle>Title</DrawerTitle>
              <DrawerDescription>Description</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const header = screen.getByTestId('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col');
    });
  });

  it('should render DrawerFooter with correct layout classes', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerFooter data-testid="footer">
              <button type="button">Cancel</button>
              <button type="button">Save</button>
            </DrawerFooter>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const footer = screen.getByTestId('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'flex-col');
    });
  });

  it('should allow custom className on Header and Footer', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerHeader className="custom-header" data-testid="header">
              <DrawerTitle>Title</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter className="custom-footer" data-testid="footer">
              <button type="button">Action</button>
            </DrawerFooter>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });
});

describe('Drawer - Title and Description styling', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should apply default styles to DrawerTitle', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle data-testid="title">Styled Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });
  });

  it('should apply default styles to DrawerDescription', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription data-testid="description">Styled Description</DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('text-sm');
    });
  });

  it('should allow custom className on Title and Description', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle className="custom-title" data-testid="title">
              Title
            </DrawerTitle>
            <DrawerDescription className="custom-desc" data-testid="description">
              Description
            </DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
      expect(screen.getByTestId('description')).toHaveClass('custom-desc');
    });
  });
});

describe('Drawer - Drag handle position based on side', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should position drag handle at top for bottom drawer', async () => {
    render(
      <Drawer defaultOpen side="bottom">
        <DrawerPortal>
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Bottom Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      const handle = content.querySelector('[data-drawer-handle]');
      // Handle should be the first child for bottom drawer
      expect(content.firstElementChild).toBe(handle);
    });
  });

  it('should position drag handle at bottom for top drawer', async () => {
    render(
      <Drawer defaultOpen side="top">
        <DrawerContent data-testid="drawer-content" showCloseButton={false}>
          <DrawerTitle>Top Drawer</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('drawer-content');
      const handle = content.querySelector('[data-drawer-handle]');
      // Handle should be the last child for top drawer (when close button is hidden)
      expect(content.lastElementChild).toBe(handle);
    });
  });
});

describe('Drawer - Simplified API (auto Portal/Overlay)', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should auto-wrap with Portal and Overlay when not inside explicit portal', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Simple Title</DrawerTitle>
            <DrawerDescription>Simple Description</DrawerDescription>
          </DrawerHeader>
          Content here
          <DrawerFooter>
            <DrawerClose>Cancel</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );

    // Initially closed
    expect(screen.queryByText('Simple Title')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open'));

    // Should open with content and overlay rendered
    await waitFor(() => {
      expect(screen.getByText('Simple Title')).toBeInTheDocument();
      expect(screen.getByText('Simple Description')).toBeInTheDocument();
      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    // Overlay should be rendered (data-state="open" on overlay element)
    const overlay = document.querySelector('[data-state="open"][aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });

  it('should render close button by default', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Close button should be rendered with X icon
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent showCloseButton={false}>
          <DrawerTitle>Title</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Close button should NOT be rendered
    const closeButton = screen.queryByRole('button', { name: /close/i });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should close via close button click', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerTitle>Title</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Title')).not.toBeInTheDocument();
    });
  });

  it('should work with explicit DrawerPortal (no double wrapping)', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerOverlay data-testid="explicit-overlay" />
          <DrawerContent data-testid="drawer-content">
            <DrawerTitle>Explicit Portal</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Explicit Portal')).toBeInTheDocument();
    });

    // Only one overlay should exist (no double-wrapping)
    const overlays = document.querySelectorAll('[data-testid="explicit-overlay"]');
    expect(overlays).toHaveLength(1);
  });
});
