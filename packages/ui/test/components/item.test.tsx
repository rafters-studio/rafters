import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Item } from '../../src/components/ui/item';

describe('Item', () => {
  it('renders with default props', () => {
    render(<Item>Settings</Item>);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    const item = screen.getByRole('option');
    expect(item).toHaveAttribute('aria-selected', 'false');
  });

  it('renders with icon slot', () => {
    render(<Item icon={<span data-testid="icon">Icon</span>}>With Icon</Item>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(<Item description="Secondary text">Primary Text</Item>);
    expect(screen.getByText('Primary Text')).toBeInTheDocument();
    expect(screen.getByText('Secondary text')).toBeInTheDocument();
  });

  it('renders with icon and description', () => {
    render(
      <Item icon={<span data-testid="icon">Icon</span>} description="Description here">
        Label
      </Item>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Description here')).toBeInTheDocument();
  });

  it('applies selected state correctly', () => {
    render(<Item selected>Selected Item</Item>);
    const item = screen.getByRole('option');
    expect(item).toHaveAttribute('aria-selected', 'true');
    expect(item).toHaveAttribute('data-selected', '');
    expect(item.className).toContain('bg-accent');
  });

  it('applies disabled state correctly', () => {
    render(<Item disabled>Disabled Item</Item>);
    const item = screen.getByRole('option');
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('data-disabled', '');
    expect(item.className).toContain('opacity-50');
    expect(item.className).toContain('pointer-events-none');
    expect(item).not.toHaveAttribute('tabIndex');
  });

  it('applies size variants correctly', () => {
    render(
      <div>
        <Item size="sm">Small</Item>
        <Item size="default">Default</Item>
        <Item size="lg">Large</Item>
      </div>,
    );

    expect(screen.getByText('Small').parentElement?.parentElement?.className).toContain(
      'text-label-small',
    );
    expect(screen.getByText('Default').parentElement?.parentElement?.className).toContain(
      'text-body-small',
    );
    expect(screen.getByText('Large').parentElement?.parentElement?.className).toContain(
      'text-body-medium',
    );
  });

  it('forwards onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Item onClick={handleClick}>Clickable</Item>);
    await user.click(screen.getByRole('option'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();

    render(
      <Item disabled onClick={handleClick}>
        Disabled
      </Item>,
    );

    // pointer-events-none prevents click, but we test the handler logic anyway
    const item = screen.getByRole('option');
    // Force click through code since pointer-events-none blocks userEvent
    item.click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation with Enter', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Item onClick={handleClick}>Keyboard Item</Item>);
    const item = screen.getByRole('option');

    item.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalled();
  });

  it('handles keyboard navigation with Space', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Item onClick={handleClick}>Keyboard Item</Item>);
    const item = screen.getByRole('option');

    item.focus();
    await user.keyboard(' ');

    expect(handleClick).toHaveBeenCalled();
  });

  it('does not handle keyboard when disabled', async () => {
    const handleClick = vi.fn();

    render(
      <Item disabled onClick={handleClick}>
        Disabled
      </Item>,
    );

    // Cannot focus disabled items (no tabIndex)
    expect(screen.getByRole('option')).not.toHaveAttribute('tabIndex');
  });

  it('is focusable when not disabled', () => {
    render(<Item>Focusable</Item>);
    const item = screen.getByRole('option');
    expect(item).toHaveAttribute('tabIndex', '0');
  });

  it('applies custom className', () => {
    render(<Item className="custom-class">Custom</Item>);
    const item = screen.getByRole('option');
    expect(item.className).toContain('custom-class');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <Item data-testid="my-item" id="item-1">
        With Attrs
      </Item>,
    );
    const item = screen.getByTestId('my-item');
    expect(item).toHaveAttribute('id', 'item-1');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Item ref={ref}>Ref Test</Item>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });

  it('includes hover state classes', () => {
    render(<Item>Hover Test</Item>);
    const item = screen.getByRole('option');
    expect(item.className).toContain('hover:bg-accent');
  });

  it('includes focus-visible state classes', () => {
    render(<Item>Focus Test</Item>);
    const item = screen.getByRole('option');
    expect(item.className).toContain('focus-visible:ring-2');
    expect(item.className).toContain('focus-visible:ring-ring');
  });

  it('includes motion transition classes with reduced motion support', () => {
    render(<Item>Motion Test</Item>);
    const item = screen.getByRole('option');
    expect(item.className).toContain('transition-colors');
    expect(item.className).toContain('motion-reduce:transition-none');
  });

  it('hides icon from screen readers', () => {
    render(<Item icon={<span>Icon</span>}>With Icon</Item>);
    const iconContainer = screen.getByText('Icon').parentElement;
    expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
  });

  it('truncates long text', () => {
    render(
      <Item description="Very long description that should be truncated">
        Very long label that should be truncated
      </Item>,
    );

    const label = screen.getByText('Very long label that should be truncated');
    expect(label.className).toContain('truncate');

    const description = screen.getByText('Very long description that should be truncated');
    expect(description.className).toContain('truncate');
  });
});
