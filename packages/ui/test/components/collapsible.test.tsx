import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../src/components/ui/collapsible';

describe('Collapsible', () => {
  it('renders children', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Toggle');
  });

  it('starts closed by default', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts open when defaultOpen is true', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Visible Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByText('Visible Content')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles open state on trigger click (uncontrolled)', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');

    // Initially closed
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-state', 'closed');

    // Click to open
    fireEvent.click(trigger);

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-state', 'open');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Click to close
    fireEvent.click(trigger);

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('works in controlled mode', () => {
    function ControlledCollapsible() {
      const [open, setOpen] = useState(false);
      return (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger>{open ? 'Close' : 'Open'}</CollapsibleTrigger>
          <CollapsibleContent>Controlled Content</CollapsibleContent>
        </Collapsible>
      );
    }

    render(<ControlledCollapsible />);

    const trigger = screen.getByRole('button');

    expect(trigger).toHaveTextContent('Open');
    expect(screen.queryByText('Controlled Content')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveTextContent('Close');
    expect(screen.getByText('Controlled Content')).toBeInTheDocument();
  });

  it('controlled prop drives open; cell does not self-open (disclosure delegation)', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Collapsible open={false} onOpenChange={onOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Controlled Content</CollapsibleContent>
      </Collapsible>,
    );

    fireEvent.click(screen.getByRole('button'));

    // Callback fired, but the cell did NOT self-open while controlled.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Controlled Content')).not.toBeInTheDocument();

    // The owning prop reflects in.
    rerender(
      <Collapsible open onOpenChange={onOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Controlled Content</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.getByText('Controlled Content')).toBeInTheDocument();
  });

  it('calls onOpenChange callback', () => {
    const handleChange = vi.fn();

    render(
      <Collapsible onOpenChange={handleChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('respects disabled state on root', () => {
    const handleChange = vi.fn();

    render(
      <Collapsible disabled onOpenChange={handleChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');

    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('data-disabled', '');

    fireEvent.click(trigger);

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('respects disabled on trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger disabled>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
  });

  it('has data-state attribute on root', () => {
    const { container } = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(container.firstChild).toHaveAttribute('data-state', 'open');

    fireEvent.click(screen.getByRole('button'));

    expect(container.firstChild).toHaveAttribute('data-state', 'closed');
  });

  it('has data-state attribute on content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveAttribute('data-state', 'open');
  });

  it('merges custom className on root', () => {
    const { container } = render(
      <Collapsible className="custom-root">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      </Collapsible>,
    );

    expect(container.firstChild).toHaveClass('custom-root');
  });

  it('merges custom className on trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger className="custom-trigger">Toggle</CollapsibleTrigger>
      </Collapsible>,
    );

    expect(screen.getByRole('button')).toHaveClass('custom-trigger');
  });

  it('merges custom className on content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent className="custom-content" data-testid="content">
          Content
        </CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByTestId('content')).toHaveClass('custom-content');
  });

  it('supports forceMount on content', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent forceMount data-testid="content">
          Force Mounted Content
        </CollapsibleContent>
      </Collapsible>,
    );

    // Content is rendered even when closed
    const content = screen.getByTestId('content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveAttribute('hidden');
    expect(content).toHaveAttribute('data-state', 'closed');
  });

  it('supports asChild on trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <a href="#toggle">Custom Trigger</a>
        </CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByText('Custom Trigger');
    expect(trigger.tagName).toBe('A');
    expect(trigger).toHaveAttribute('href', '#toggle');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('supports asChild on content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent asChild>
          <section data-testid="custom-content">Custom Content</section>
        </CollapsibleContent>
      </Collapsible>,
    );

    const content = screen.getByTestId('custom-content');
    expect(content.tagName).toBe('SECTION');
    expect(content).toHaveAttribute('data-state', 'open');
  });

  it('links trigger and content with aria-controls', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    const content = screen.getByTestId('content');

    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(content).toHaveAttribute('id', controlsId);
  });

  it('links content to trigger with aria-labelledby', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    const content = screen.getByTestId('content');

    const triggerId = trigger.getAttribute('id');
    expect(triggerId).toBeTruthy();
    expect(content).toHaveAttribute('aria-labelledby', triggerId);
  });

  it('passes additional props to root element', () => {
    const { container } = render(
      <Collapsible data-testid="root" aria-label="Collapsible section">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      </Collapsible>,
    );

    expect(container.firstChild).toHaveAttribute('data-testid', 'root');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Collapsible section');
  });

  it('passes additional props to trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger data-custom="value">Toggle</CollapsibleTrigger>
      </Collapsible>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('data-custom', 'value');
  });

  it('passes additional props to content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content" data-custom="value">
          Content
        </CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByTestId('content')).toHaveAttribute('data-custom', 'value');
  });

  it('applies animation classes to content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveClass('overflow-hidden');
    expect(content).toHaveClass('transition-all');
  });

  it('throws when used outside of Collapsible context', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<CollapsibleTrigger>Orphan Trigger</CollapsibleTrigger>);
    }).toThrow('Collapsible components must be used within Collapsible');

    consoleSpy.mockRestore();
  });
});
