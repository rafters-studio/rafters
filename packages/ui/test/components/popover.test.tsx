/**
 * Popover component tests
 * Tests SSR, hydration, interactions, and positioning
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from '../../src/components/ui/popover';

describe('Popover - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Open'); // Trigger should render
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Server Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('Popover - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client', async () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Hydrated Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    // Rerender should maintain open state
    rerender(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Popover - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Popover Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    // Initially closed
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open Popover'));

    // Should open
    await waitFor(() => {
      expect(screen.getByText('Popover Content')).toBeInTheDocument();
    });
  });

  it('should close when trigger is clicked again', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    // Open
    await user.click(screen.getByText('Toggle'));
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    // Close
    await user.click(screen.getByText('Toggle'));
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>
            <p>Content</p>
            <PopoverClose>Close</PopoverClose>
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    // Initially open
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    // Click close
    await user.click(screen.getByText('Close'));

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('should close when clicking outside', async () => {
    render(
      <div>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent>Content</PopoverContent>
          </PopoverPortal>
        </Popover>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    // Click outside using pointerdown
    const outsideButton = screen.getByTestId('outside');
    fireEvent.pointerDown(outsideButton);

    // Should close
    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('should not close when clicking inside content', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>
            <button type="button" data-testid="inside">
              Inside Button
            </button>
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('inside')).toBeInTheDocument();
    });

    // Click inside
    await user.click(screen.getByTestId('inside'));

    // Should still be open
    expect(screen.getByTestId('inside')).toBeInTheDocument();
  });
});

describe('Popover - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const ControlledPopover = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Popover
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent>
              <p>Controlled</p>
              <PopoverClose>Close</PopoverClose>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      );
    };

    render(<ControlledPopover />);

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
});

describe('Popover - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have correct ARIA attributes on trigger', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    const trigger = screen.getByText('Open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('should have role="dialog" on content', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  it('should have data-state on content', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });
  });

  it('should toggle aria-expanded on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Toggle</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    const trigger = screen.getByText('Toggle');

    // Initially closed
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-state', 'closed');

    // Open
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });
});

describe('Popover - Positioning', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should have data-side attribute based on positioning', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent side="bottom">Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-side');
    });
  });

  it('should have data-align attribute based on positioning', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent align="start">Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-align');
    });
  });

  it('should support different side values', async () => {
    const sides: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

    for (const side of sides) {
      const { unmount } = render(
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent side={side}>Content</PopoverContent>
          </PopoverPortal>
        </Popover>,
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      unmount();
    }
  });
});

describe('Popover - PopoverAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render anchor element', () => {
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor">
          <span>Anchor Content</span>
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    expect(screen.getByTestId('anchor')).toBeInTheDocument();
    expect(screen.getByText('Anchor Content')).toBeInTheDocument();
  });

  it('should support asChild on anchor', () => {
    render(
      <Popover>
        <PopoverAnchor asChild>
          <span data-testid="custom-anchor">Custom Anchor</span>
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    const anchor = screen.getByTestId('custom-anchor');
    expect(anchor.tagName).toBe('SPAN');
    expect(anchor).toHaveTextContent('Custom Anchor');
  });
});

describe('Popover - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support asChild on trigger', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger asChild>
          <a href="#open">Custom Trigger</a>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>Opened</PopoverContent>
        </PopoverPortal>
      </Popover>,
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
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>
            <p>Content</p>
            <PopoverClose asChild>
              <a href="#close">Custom Close</a>
            </PopoverClose>
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    const closeLink = screen.getByText('Custom Close');
    expect(closeLink.tagName).toBe('A');

    await user.click(closeLink);

    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });
});

describe('Popover - Custom Styling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should allow custom className on content', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent className="custom-class" data-testid="content">
            Content
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-class');
    });
  });

  it('should have default styling classes', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent data-testid="content">Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('z-depth-popover', 'w-72', 'rounded-md', 'border');
    });
  });
});

describe('Popover - Event Handlers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should call onEscapeKeyDown when escape is pressed', async () => {
    const user = userEvent.setup();
    const onEscapeKeyDown = vi.fn();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent onEscapeKeyDown={onEscapeKeyDown}>Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    expect(onEscapeKeyDown).toHaveBeenCalled();
  });

  it('should call onPointerDownOutside when clicking outside', async () => {
    const onPointerDownOutside = vi.fn();

    render(
      <div>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverPortal>
            <PopoverContent onPointerDownOutside={onPointerDownOutside}>Content</PopoverContent>
          </PopoverPortal>
        </Popover>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    const outsideButton = screen.getByTestId('outside');
    fireEvent.pointerDown(outsideButton);

    expect(onPointerDownOutside).toHaveBeenCalled();
  });

  it('should prevent close when onEscapeKeyDown calls preventDefault', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            Content
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // Should still be open because preventDefault was called
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Popover - Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should focus first focusable element when opened', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent>
            <button type="button">First Button</button>
            <button type="button">Second Button</button>
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('First Button')).toHaveFocus();
    });
  });
});

describe('Popover - forceMount', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render content when forceMount is true even if closed', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal forceMount>
          <PopoverContent forceMount data-testid="content">
            Force Mounted Content
          </PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute('data-state', 'closed');
    });
  });
});

describe('Popover - Auto-Portal (shadcn drop-in)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should auto-portal content without explicit PopoverPortal wrapper', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Auto-Portaled Content</PopoverContent>
      </Popover>,
    );

    // Initially closed
    expect(screen.queryByText('Auto-Portaled Content')).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByText('Open'));

    // Should open and render in portal (body)
    await waitFor(() => {
      expect(screen.getByText('Auto-Portaled Content')).toBeInTheDocument();
    });

    // Verify it's portaled to body (not nested in the original DOM)
    const content = screen.getByRole('dialog');
    expect(content.closest('body > *')).toBeTruthy();
  });

  it('should work with defaultOpen without explicit Portal', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Default Open Content</PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Default Open Content')).toBeInTheDocument();
    });
  });

  it('should close on escape without explicit Portal', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Escape Test</PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Escape Test')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Escape Test')).not.toBeInTheDocument();
    });
  });

  it('should close on outside click without explicit Portal', async () => {
    render(
      <div>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Outside Click Test</PopoverContent>
        </Popover>
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText('Outside Click Test')).toBeInTheDocument();
    });

    fireEvent.pointerDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Outside Click Test')).not.toBeInTheDocument();
    });
  });

  it('should support container prop without explicit Portal', async () => {
    const customContainer = document.createElement('div');
    customContainer.id = 'custom-portal-container';
    document.body.appendChild(customContainer);

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent container={customContainer}>Custom Container Content</PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      const content = screen.getByText('Custom Container Content');
      expect(content).toBeInTheDocument();
      expect(content.closest('#custom-portal-container')).toBeTruthy();
    });

    document.body.removeChild(customContainer);
  });

  it('should not double-wrap when used with explicit PopoverPortal', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverPortal>
          <PopoverContent data-testid="content">Explicit Portal Content</PopoverContent>
        </PopoverPortal>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Explicit Portal Content')).toBeInTheDocument();
    });

    // Should only have one dialog element (not double-portaled)
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
  });

  it('should support PopoverClose without explicit Portal', async () => {
    const user = userEvent.setup();

    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <p>Content</p>
          <PopoverClose>Close Button</PopoverClose>
        </PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Close Button'));

    await waitFor(() => {
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  it('should focus first element without explicit Portal', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <button type="button">First</button>
          <button type="button">Second</button>
        </PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('First')).toHaveFocus();
    });
  });

  it('should have correct ARIA attributes without explicit Portal', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>ARIA Test</PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      const trigger = screen.getByText('Open');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('data-state', 'open');

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });
  });

  it('should support positioning props without explicit Portal', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent side="top" align="start" sideOffset={8}>
          Positioned Content
        </PopoverContent>
      </Popover>,
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('data-side');
      expect(dialog).toHaveAttribute('data-align');
    });
  });
});
