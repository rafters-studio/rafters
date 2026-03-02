/**
 * Drawer component accessibility tests
 * Tests ARIA attributes, focus management, and keyboard navigation
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
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
} from '../../src/components/ui/drawer';

describe('Drawer - Accessibility', () => {
  beforeEach(() => {
    cleanup();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Drawer defaultOpen>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer Title</DrawerTitle>
              <DrawerDescription>Drawer description text</DrawerDescription>
            </DrawerHeader>
            <p>Drawer content goes here</p>
            <DrawerFooter>
              <DrawerClose>Close</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <Drawer>
        <DrawerTrigger>Open Drawer</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="dialog"', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('has aria-modal="true" for modal drawers', async () => {
    render(
      <Drawer defaultOpen modal>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Modal Drawer</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('has aria-labelledby pointing to title', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>My Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();

      const title = document.getElementById(titleId as string);
      expect(title).toHaveTextContent('My Title');
    });
  });

  it('has aria-describedby pointing to description', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>My description text</DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      const descriptionId = dialog.getAttribute('aria-describedby');
      expect(descriptionId).toBeTruthy();

      const description = document.getElementById(descriptionId as string);
      expect(description).toHaveTextContent('My description text');
    });
  });

  it('trigger has correct aria-expanded attribute', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open drawer
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger has aria-haspopup="dialog"', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-controls pointing to drawer content', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    await user.click(trigger);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('id', controlsId);
    });
  });

  it('focuses first focusable element when opened', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Title</DrawerTitle>
            <button type="button">First Button</button>
            <button type="button">Second Button</button>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      // First focusable element should have focus
      expect(screen.getByRole('button', { name: 'First Button' })).toHaveFocus();
    });
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Escape Test</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('calls onOpenChange with false on Escape key press', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <Drawer defaultOpen onOpenChange={handleOpenChange}>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Escape Callback Test</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('returns focus to trigger on close', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Focus Return Test</DrawerTitle>
            <DrawerClose data-testid="close-btn">Close</DrawerClose>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('close-btn'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('has data-state attribute for open/closed states', async () => {
    const user = userEvent.setup();

    render(
      <Drawer>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>State Test</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-state', 'open');
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });

  it('overlay has aria-hidden="true"', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerOverlay data-testid="overlay" />
          <DrawerContent>
            <DrawerTitle>Overlay Test</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const overlay = screen.getByTestId('overlay');
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('works correctly with all side variants', async () => {
    const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

    for (const side of sides) {
      cleanup();

      const { container } = render(
        <Drawer defaultOpen side={side}>
          <DrawerPortal>
            <DrawerContent>
              <DrawerTitle>{side} Drawer</DrawerTitle>
              <DrawerDescription>Description for {side}</DrawerDescription>
            </DrawerContent>
          </DrawerPortal>
        </Drawer>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('drag handle has aria-hidden for screen readers', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Drag Handle A11y</DrawerTitle>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      const handle = document.querySelector('[data-drawer-handle]');
      expect(handle).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('maintains focus within drawer when clicking drag handle', async () => {
    const user = userEvent.setup();

    render(
      <Drawer defaultOpen>
        <DrawerPortal>
          <DrawerContent>
            <DrawerTitle>Drag Handle Focus</DrawerTitle>
            <button type="button">Focusable</button>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Focusable')).toBeInTheDocument();
    });

    // Click on the handle area
    const handle = document.querySelector('[data-drawer-handle]');
    if (handle) {
      await user.click(handle);
    }

    // Focus should still be trapped within drawer
    await user.tab();
    expect(screen.getByRole('button', { name: 'Focusable' })).toHaveFocus();
  });
});
