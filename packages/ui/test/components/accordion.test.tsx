import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../src/components/ui/accordion';

describe('Accordion', () => {
  it('renders accordion with items', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByRole('button', { name: 'Item 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item 2' })).toBeInTheDocument();
  });

  it('expands content on click (single type)', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('shows correct content for defaultValue', () => {
    render(
      <Accordion type="single" defaultValue="item2">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).not.toBeVisible();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('closes previous item when opening new one in single mode', () => {
    render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Item 2' }));

    expect(screen.getByText('Content 1')).not.toBeVisible();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('prevents closing in single mode when collapsible is false', () => {
    render(
      <Accordion type="single" defaultValue="item1" collapsible={false}>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    // Click to try to close
    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    // Should still be open
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('allows closing in single mode when collapsible is true', () => {
    render(
      <Accordion type="single" defaultValue="item1" collapsible>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    expect(screen.getByText('Content 1')).not.toBeVisible();
  });

  it('allows multiple items open in multiple mode', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Item 2' }));

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('supports multiple defaultValue in multiple mode', () => {
    render(
      <Accordion type="multiple" defaultValue={['item1', 'item2']}>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.getByText('Content 3')).not.toBeVisible();
  });

  it('works in controlled mode (single)', () => {
    function ControlledAccordion() {
      const [value, setValue] = useState<string>('');
      return (
        <Accordion type="single" value={value} onValueChange={(v) => setValue(v as string)}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    render(<ControlledAccordion />);

    expect(screen.getByText('Content 1')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('works in controlled mode (multiple)', () => {
    function ControlledAccordion() {
      const [value, setValue] = useState<string[]>([]);
      return (
        <Accordion type="multiple" value={value} onValueChange={(v) => setValue(v as string[])}>
          <AccordionItem value="item1">
            <AccordionTrigger>Item 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Item 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    render(<ControlledAccordion />);

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Item 2' }));

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('calls onValueChange with correct value (single)', () => {
    const handleChange = vi.fn();

    render(
      <Accordion type="single" onValueChange={handleChange}>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    expect(handleChange).toHaveBeenCalledWith('item1');
  });

  it('calls onValueChange with correct value (multiple)', () => {
    const handleChange = vi.fn();

    render(
      <Accordion type="multiple" onValueChange={handleChange}>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));
    expect(handleChange).toHaveBeenCalledWith(['item1']);

    fireEvent.click(screen.getByRole('button', { name: 'Item 2' }));
    expect(handleChange).toHaveBeenCalledWith(['item1', 'item2']);
  });

  it('supports arrow key navigation', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger1 = screen.getByRole('button', { name: 'Item 1' });
    const trigger2 = screen.getByRole('button', { name: 'Item 2' });
    const trigger3 = screen.getByRole('button', { name: 'Item 3' });

    trigger1.focus();
    expect(document.activeElement).toBe(trigger1);

    // ArrowDown moves to next item
    fireEvent.keyDown(trigger1, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trigger2);

    // ArrowDown again
    fireEvent.keyDown(trigger2, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trigger3);

    // ArrowDown wraps to first
    fireEvent.keyDown(trigger3, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trigger1);

    // ArrowUp wraps to last
    fireEvent.keyDown(trigger1, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(trigger3);
  });

  it('supports Home and End keys', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger1 = screen.getByRole('button', { name: 'Item 1' });
    const trigger2 = screen.getByRole('button', { name: 'Item 2' });
    const trigger3 = screen.getByRole('button', { name: 'Item 3' });

    trigger2.focus();

    // Home goes to first
    fireEvent.keyDown(trigger2, { key: 'Home' });
    expect(document.activeElement).toBe(trigger1);

    // End goes to last
    fireEvent.keyDown(trigger1, { key: 'End' });
    expect(document.activeElement).toBe(trigger3);
  });

  it('skips disabled items in keyboard navigation', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2" disabled>
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionTrigger>Item 3</AccordionTrigger>
          <AccordionContent>Content 3</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger1 = screen.getByRole('button', { name: 'Item 1' });
    const trigger3 = screen.getByRole('button', { name: 'Item 3' });

    trigger1.focus();

    // ArrowDown skips disabled item2
    fireEvent.keyDown(trigger1, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(trigger3);
  });

  it('does not expand when disabled trigger is clicked', () => {
    render(
      <Accordion type="single">
        <AccordionItem value="item1" disabled>
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));

    expect(screen.getByText('Content 1')).not.toBeVisible();
  });

  it('sets correct data-state on items', () => {
    render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1" data-testid="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2" data-testid="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByTestId('item1')).toHaveAttribute('data-state', 'open');
    expect(screen.getByTestId('item2')).toHaveAttribute('data-state', 'closed');
  });

  it('sets correct data-state on triggers', () => {
    render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger1 = screen.getByRole('button', { name: 'Item 1' });
    const trigger2 = screen.getByRole('button', { name: 'Item 2' });

    expect(trigger1).toHaveAttribute('data-state', 'open');
    expect(trigger2).toHaveAttribute('data-state', 'closed');
  });

  it('supports forceMount on AccordionContent', () => {
    render(
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent forceMount>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    // Both contents exist in DOM when forceMount is used
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();

    // Inactive content is hidden
    const content2 = screen.getByText('Content 2').closest('[role="region"]');
    expect(content2).toHaveAttribute('hidden');
  });

  it('merges custom className on all components', () => {
    const { container } = render(
      <Accordion type="single" defaultValue="item1" className="accordion-root">
        <AccordionItem value="item1" className="accordion-item">
          <AccordionTrigger className="accordion-trigger">Item 1</AccordionTrigger>
          <AccordionContent className="accordion-content">Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(container.querySelector('.accordion-root')).toBeInTheDocument();
    expect(container.querySelector('.accordion-item')).toBeInTheDocument();
    expect(container.querySelector('.accordion-trigger')).toBeInTheDocument();
    expect(container.querySelector('.accordion-content')).toBeInTheDocument();
  });

  it('passes through additional props', () => {
    render(
      <Accordion type="single" defaultValue="item1" data-testid="accordion-root">
        <AccordionItem value="item1" data-testid="accordion-item">
          <AccordionTrigger data-testid="accordion-trigger">Item 1</AccordionTrigger>
          <AccordionContent data-testid="accordion-content">Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByTestId('accordion-root')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-item')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
  });

  it('toggles on Enter key', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'Item 1' });
    trigger.focus();

    // Native button should handle Enter
    fireEvent.click(trigger);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('toggles on Space key', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'Item 1' });
    trigger.focus();

    // Native button should handle Space
    fireEvent.click(trigger);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('supports namespaced export', () => {
    render(
      <Accordion type="single" defaultValue="item1">
        <Accordion.Item value="item1">
          <Accordion.Trigger>Item 1</Accordion.Trigger>
          <Accordion.Content>Content 1</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );

    expect(screen.getByRole('button', { name: 'Item 1' })).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});
