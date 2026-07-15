/**
 * HoverCard component tests
 * Tests SSR, hydration, interactions, and hover behavior
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
  resetHoverCardState,
} from '../../../src/old/ui/hover-card';

describe('HoverCard - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <HoverCard>
        <HoverCardTrigger>@johndoe</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>User profile content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('@johndoe');
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <HoverCard open>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Server Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Content');
  });
});

describe('HoverCard - Client Hydration', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should hydrate and render portal content on client when open', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Hydrated Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
    });
  });
});

describe('HoverCard - Basic Interactions', () => {
  beforeEach(() => {
    cleanup();
    resetHoverCardState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show hover card on hover after delay', async () => {
    render(
      <HoverCard openDelay={700}>
        <HoverCardTrigger>@username</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('@username');

    // Initially closed
    expect(screen.queryByText('Profile preview')).not.toBeInTheDocument();

    // Hover over trigger
    fireEvent.mouseEnter(trigger);

    // Still closed before delay
    expect(screen.queryByText('Profile preview')).not.toBeInTheDocument();

    // Fast-forward past delay
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    // Should be open now
    expect(screen.getByText('Profile preview')).toBeInTheDocument();
  });

  it('should hide hover card on mouse leave', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>@username</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('@username');

    // Hover to open
    fireEvent.mouseEnter(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Profile preview')).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Should close
    expect(screen.queryByText('Profile preview')).not.toBeInTheDocument();
  });

  it('should show hover card on focus', async () => {
    render(
      <HoverCard openDelay={0}>
        <HoverCardTrigger>Focus me</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Hover card on focus</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Focus me');

    // Focus trigger
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Hover card on focus')).toBeInTheDocument();
  });

  it('should hide hover card on blur', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>Focus me</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Hover card on focus</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Focus me');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Hover card on focus')).toBeInTheDocument();

    // Blur to close
    fireEvent.blur(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByText('Hover card on focus')).not.toBeInTheDocument();
  });

  it('should keep open when hovering over content', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={100}>
        <HoverCardTrigger>@username</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent data-testid="content">Profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('@username');

    // Hover to open
    fireEvent.mouseEnter(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Profile preview')).toBeInTheDocument();

    // Leave trigger but enter content
    fireEvent.mouseLeave(trigger);
    const content = screen.getByTestId('content');
    fireEvent.mouseEnter(content);

    // Wait past close delay
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Should still be open because hovering content
    expect(screen.getByText('Profile preview')).toBeInTheDocument();
  });

  it('should close when leaving content', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={50}>
        <HoverCardTrigger>@username</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent data-testid="content">Profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('@username');

    // Hover to open
    fireEvent.mouseEnter(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Profile preview')).toBeInTheDocument();

    // Leave trigger and enter content
    fireEvent.mouseLeave(trigger);
    const content = screen.getByTestId('content');
    fireEvent.mouseEnter(content);

    // Now leave content
    fireEvent.mouseLeave(content);

    // Wait for close delay
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    // Should close
    expect(screen.queryByText('Profile preview')).not.toBeInTheDocument();
  });
});

describe('HoverCard - Controlled Mode', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should work in controlled mode', async () => {
    const onOpenChange = vi.fn();

    const ControlledHoverCard = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <HoverCard
          open={open}
          onOpenChange={(newOpen) => {
            setOpen(newOpen);
            onOpenChange(newOpen);
          }}
        >
          <HoverCardTrigger>Controlled</HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent>Controlled hover card</HoverCardContent>
          </HoverCardPortal>
          <button type="button" onClick={() => setOpen(true)}>
            Open externally
          </button>
        </HoverCard>
      );
    };

    render(<ControlledHoverCard />);

    // Initially closed
    expect(screen.queryByText('Controlled hover card')).not.toBeInTheDocument();

    // Open via external button
    fireEvent.click(screen.getByText('Open externally'));

    await waitFor(() => {
      expect(screen.getByText('Controlled hover card')).toBeInTheDocument();
    });
  });

  it('should respect defaultOpen prop', async () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Default open</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Already visible</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByText('Already visible')).toBeInTheDocument();
    });
  });
});

describe('HoverCard - Delay Configuration', () => {
  beforeEach(() => {
    cleanup();
    resetHoverCardState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use custom openDelay', async () => {
    render(
      <HoverCard openDelay={100}>
        <HoverCardTrigger>Custom delay</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Custom delay');
    fireEvent.mouseEnter(trigger);

    // Not visible at 50ms
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    // Visible at 100ms
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should use custom closeDelay', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={200}>
        <HoverCardTrigger>Custom close delay</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Custom close delay');

    // Open
    fireEvent.mouseEnter(trigger);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Leave trigger
    fireEvent.mouseLeave(trigger);

    // Still visible at 100ms
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Closed at 200ms
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should skip open delay when recently opened another hover card', async () => {
    const { rerender } = render(
      <HoverCard openDelay={700} closeDelay={0}>
        <HoverCardTrigger data-testid="trigger1">First</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>First content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger1 = screen.getByTestId('trigger1');

    // Open first hover card (wait full delay)
    fireEvent.mouseEnter(trigger1);
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByText('First content')).toBeInTheDocument();

    // Close it
    fireEvent.mouseLeave(trigger1);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.queryByText('First content')).not.toBeInTheDocument();

    // Render second hover card
    rerender(
      <HoverCard openDelay={700} closeDelay={0}>
        <HoverCardTrigger data-testid="trigger2">Second</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Second content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger2 = screen.getByTestId('trigger2');

    // Hover second - should open immediately due to skip delay
    fireEvent.mouseEnter(trigger2);
    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Should open without waiting 700ms
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });
});

describe('HoverCard - Content Positioning', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should position content with correct data attributes', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent side="bottom" align="center">
            Positioned content
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const content = screen.getByRole('dialog');
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute('data-state', 'open');
    });
  });

  it('should support different side options', async () => {
    const { rerender } = render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent side="top">Top content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    rerender(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent side="right">Right content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByText('Right content')).toBeInTheDocument();
    });
  });

  it('should have data-side and data-align attributes', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent side="bottom" align="start">
            Content
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const content = screen.getByRole('dialog');
      expect(content).toHaveAttribute('data-side');
      expect(content).toHaveAttribute('data-align');
    });
  });
});

describe('HoverCard - ARIA Attributes', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should have role="dialog" on content', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Accessible content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should link trigger to content with aria-describedby when open', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Linked content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const trigger = screen.getByText('Trigger');
      const content = screen.getByRole('dialog');

      expect(trigger).toHaveAttribute('aria-describedby', content.id);
    });
  });

  it('should not have aria-describedby when closed', () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Hidden content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('Trigger');
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('should have data-state attribute on trigger', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>State trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('State trigger');

    // Initially closed
    expect(trigger).toHaveAttribute('data-state', 'closed');

    // Hover to open
    await userEvent.hover(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });
});

describe('HoverCard - Escape Key', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should close on escape key', async () => {
    const user = userEvent.setup();

    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should call onEscapeKeyDown handler', async () => {
    const user = userEvent.setup();
    const onEscapeKeyDown = vi.fn();

    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent onEscapeKeyDown={onEscapeKeyDown}>Content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    expect(onEscapeKeyDown).toHaveBeenCalled();
  });

  it('should prevent close when onEscapeKeyDown calls preventDefault', async () => {
    const user = userEvent.setup();

    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            Content
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    // Should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('HoverCard - asChild Pattern', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should support asChild on trigger', async () => {
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger asChild>
          <a href="/user/john">@johndoe</a>
        </HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent>Profile preview</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    const trigger = screen.getByText('@johndoe');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '/user/john');

    await userEvent.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText('Profile preview')).toBeInTheDocument();
    });
  });

  it('should support asChild on content', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent asChild>
            <article data-testid="custom-content">Custom content element</article>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('custom-content');
      expect(content.tagName).toBe('ARTICLE');
      expect(content).toHaveAttribute('role', 'dialog');
    });
  });
});

describe('HoverCard - Custom className', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should merge custom className with default styles', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal>
          <HoverCardContent className="custom-hover-card-class">Styled content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('custom-hover-card-class');
      expect(content).toHaveClass('rounded-md');
    });
  });
});

describe('HoverCard - Multiple HoverCards', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should handle multiple hover cards independently', async () => {
    render(
      <>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger>First trigger</HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent>First content</HoverCardContent>
          </HoverCardPortal>
        </HoverCard>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger>Second trigger</HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent>Second content</HoverCardContent>
          </HoverCardPortal>
        </HoverCard>
      </>,
    );

    const firstTrigger = screen.getByText('First trigger');
    const secondTrigger = screen.getByText('Second trigger');

    // Hover first
    await userEvent.hover(firstTrigger);

    await waitFor(() => {
      expect(screen.getByText('First content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();

    // Leave first, hover second
    await userEvent.unhover(firstTrigger);
    await userEvent.hover(secondTrigger);

    await waitFor(() => {
      expect(screen.getByText('Second content')).toBeInTheDocument();
    });
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });
});

describe('HoverCard - forceMount', () => {
  beforeEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should render content when forceMount is true even when closed', async () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal forceMount>
          <HoverCardContent forceMount>Force mounted content</HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      expect(screen.getByText('Force mounted content')).toBeInTheDocument();
    });
  });

  it('should have data-state=closed when force mounted but not open', async () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardPortal forceMount>
          <HoverCardContent forceMount data-testid="content">
            Content
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>,
    );

    await waitFor(() => {
      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('data-state', 'closed');
    });
  });
});

describe('HoverCard - open state delegates to createDisclosure (migration)', () => {
  afterEach(() => cleanup());
  it('reflects a controlled open prop through the disclosure cell', () => {
    const { rerender } = render(
      <HoverCard open={false}>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardContent>Reflected hovercard</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.queryByText('Reflected hovercard')).not.toBeInTheDocument();
    rerender(
      <HoverCard open={true}>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardContent>Reflected hovercard</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.getByText('Reflected hovercard')).toBeInTheDocument();
  });
});
