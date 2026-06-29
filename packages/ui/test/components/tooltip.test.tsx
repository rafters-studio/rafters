/**
 * Tooltip component tests
 * Tests SSR, hydration, interactions, and hover behavior
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetTooltipState,
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '../../src/components/ui/tooltip';

describe('Tooltip - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip text</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Hover me');
  });

  it('should not render portal content on server', () => {
    const html = renderToString(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Server Tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    // Portal content should not be in SSR output
    expect(html).not.toContain('Server Tooltip');
  });
});

describe('Tooltip - Client Hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should hydrate and render portal content on client when open', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Hydrated Tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Hydrated Tooltip')).toBeInTheDocument();
    });
  });
});

describe('Tooltip - Basic Interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show tooltip on hover after delay', async () => {
    render(
      <TooltipProvider delayDuration={700}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip text</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Hover me');

    // Initially closed
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    // Hover over trigger
    fireEvent.mouseEnter(trigger);

    // Still closed before delay
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    // Fast-forward past delay
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    // Should be open now
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('should hide tooltip on mouse leave', async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip text</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Hover me');

    // Hover to open
    fireEvent.mouseEnter(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Tooltip text')).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    // Should close
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
  });

  it('should show tooltip on focus', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Focus me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip on focus</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Focus me');

    // Focus trigger
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Tooltip on focus')).toBeInTheDocument();
  });

  it('should hide tooltip on blur', async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Focus me</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip on focus</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Focus me');

    // Focus to open
    fireEvent.focus(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText('Tooltip on focus')).toBeInTheDocument();

    // Blur to close
    fireEvent.blur(trigger);

    await act(async () => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByText('Tooltip on focus')).not.toBeInTheDocument();
  });
});

describe('Tooltip - Controlled Mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work in controlled mode', async () => {
    const onOpenChange = vi.fn();

    const ControlledTooltip = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <TooltipProvider>
          <Tooltip
            open={open}
            onOpenChange={(newOpen) => {
              setOpen(newOpen);
              onOpenChange(newOpen);
            }}
          >
            <TooltipTrigger>Controlled</TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Controlled tooltip</TooltipContent>
            </TooltipPortal>
          </Tooltip>
          <button type="button" onClick={() => setOpen(true)}>
            Open externally
          </button>
        </TooltipProvider>
      );
    };

    render(<ControlledTooltip />);

    // Initially closed
    expect(screen.queryByText('Controlled tooltip')).not.toBeInTheDocument();

    // Open via external button
    fireEvent.click(screen.getByText('Open externally'));

    await waitFor(() => {
      expect(screen.getByText('Controlled tooltip')).toBeInTheDocument();
    });
  });

  it('should respect defaultOpen prop', async () => {
    render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger>Default open</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Already visible</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Already visible')).toBeInTheDocument();
    });
  });
});

describe('Tooltip - Provider Configuration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetTooltipState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use provider delayDuration', async () => {
    render(
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger>Custom delay</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip text</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Custom delay');
    fireEvent.mouseEnter(trigger);

    // Not visible at 50ms
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    // Visible at 100ms
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('should override provider delayDuration with tooltip prop', async () => {
    render(
      <TooltipProvider delayDuration={1000}>
        <Tooltip delayDuration={50}>
          <TooltipTrigger>Override delay</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Quick tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Override delay');
    fireEvent.mouseEnter(trigger);

    // Should appear quickly (using 50ms override, not 1000ms provider default)
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Quick tooltip')).toBeInTheDocument();
  });
});

describe('Tooltip - Content Positioning', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should position content with correct data attributes', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" align="center">
              Positioned tooltip
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const content = screen.getByRole('tooltip');
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute('data-state', 'open');
    });
  });

  it('should support different side options', async () => {
    const { rerender } = render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">Top tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    rerender(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="right">Right tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Right tooltip')).toBeInTheDocument();
    });
  });
});

describe('Tooltip - ARIA Attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should have role="tooltip" on content', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Accessible tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('should link trigger to content with aria-describedby when open', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Linked tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const trigger = screen.getByText('Trigger');
      const content = screen.getByRole('tooltip');

      expect(trigger).toHaveAttribute('aria-describedby', content.id);
    });
  });

  it('should not have aria-describedby when closed', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Hidden tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Trigger');
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('should have data-state attribute on trigger', async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>State trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('State trigger');

    // Initially closed
    expect(trigger).toHaveAttribute('data-state', 'closed');

    // Hover to open - use userEvent for better real-world simulation
    await userEvent.hover(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('data-state', 'open');
    });
  });
});

describe('Tooltip - asChild Pattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should support asChild on trigger', async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a href="#link">Custom link trigger</a>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Link tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText('Custom link trigger');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#link');

    await userEvent.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText('Link tooltip')).toBeInTheDocument();
    });
  });
});

describe('Tooltip - Custom className', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should merge custom className with default styles', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent className="custom-tooltip-class">Styled tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      const content = screen.getByRole('tooltip');
      expect(content).toHaveClass('custom-tooltip-class');
      expect(content).toHaveClass('rounded-md');
    });
  });
});

describe('Tooltip - Multiple Tooltips', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should handle multiple tooltips independently', async () => {
    render(
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger>First trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>First tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>Second trigger</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>Second tooltip</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    const firstTrigger = screen.getByText('First trigger');
    const secondTrigger = screen.getByText('Second trigger');

    // Hover first
    await userEvent.hover(firstTrigger);

    await waitFor(() => {
      expect(screen.getByText('First tooltip')).toBeInTheDocument();
    });
    expect(screen.queryByText('Second tooltip')).not.toBeInTheDocument();

    // Leave first, hover second
    await userEvent.unhover(firstTrigger);
    await userEvent.hover(secondTrigger);

    await waitFor(() => {
      expect(screen.getByText('Second tooltip')).toBeInTheDocument();
    });
    expect(screen.queryByText('First tooltip')).not.toBeInTheDocument();
  });
});

describe('Tooltip - forceMount', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should render content when forceMount is true even when closed', async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipPortal forceMount>
            <TooltipContent forceMount>Force mounted content</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Force mounted content')).toBeInTheDocument();
    });
  });
});

describe('Tooltip - open state delegates to createDisclosure (migration)', () => {
  it('reflects a controlled open prop through the disclosure cell', () => {
    const { rerender } = render(
      <TooltipProvider>
        <Tooltip open={false}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Reflected tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByText('Reflected tooltip')).not.toBeInTheDocument();
    rerender(
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Reflected tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText('Reflected tooltip')).toBeInTheDocument();
  });
});
