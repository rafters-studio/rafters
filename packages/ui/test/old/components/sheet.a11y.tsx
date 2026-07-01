/**
 * Sheet component accessibility tests
 * Tests ARIA attributes, focus management, and keyboard navigation
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
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
} from '../../../src/old/ui/sheet';

describe('Sheet - Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>Sheet description text</SheetDescription>
            </SheetHeader>
            <p>Sheet content goes here</p>
            <SheetFooter>
              <SheetClose>Close</SheetClose>
            </SheetFooter>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="dialog"', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('has aria-modal="true" for modal sheets', async () => {
    render(
      <Sheet defaultOpen modal>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Modal Sheet</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('has aria-labelledby pointing to title', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>My Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>My description text</SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open sheet
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('trigger has aria-haspopup="dialog"', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('trigger has aria-controls pointing to sheet content', async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();

    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Escape Test</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('returns focus to trigger on close', async () => {
    const user = userEvent.setup();

    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>Focus Return Test</SheetTitle>
            <SheetClose data-testid="close-btn">Close</SheetClose>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>State Test</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetOverlay data-testid="overlay" />
          <SheetContent>
            <SheetTitle>Overlay Test</SheetTitle>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
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
        <Sheet defaultOpen>
          <SheetPortal>
            <SheetContent side={side}>
              <SheetTitle>{side} Sheet</SheetTitle>
              <SheetDescription>Description for {side}</SheetDescription>
            </SheetContent>
          </SheetPortal>
        </Sheet>,
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });
});
