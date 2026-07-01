import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from '../../../src/old/ui/toggle';

describe('Toggle', () => {
  it('renders children', () => {
    render(<Toggle>Bold</Toggle>);
    expect(screen.getByRole('button')).toHaveTextContent('Bold');
  });

  it('toggles state on click (uncontrolled)', () => {
    render(<Toggle>Toggle</Toggle>);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('data-state', 'off');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-state', 'on');
  });

  it('respects defaultPressed', () => {
    render(<Toggle defaultPressed>Toggle</Toggle>);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-state', 'on');
  });

  it('works in controlled mode', () => {
    function ControlledToggle() {
      const [pressed, setPressed] = useState(false);
      return (
        <Toggle pressed={pressed} onPressedChange={setPressed}>
          {pressed ? 'On' : 'Off'}
        </Toggle>
      );
    }

    render(<ControlledToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveTextContent('Off');
    fireEvent.click(button);
    expect(button).toHaveTextContent('On');
  });

  it('calls onPressedChange', () => {
    const handleChange = vi.fn();
    render(<Toggle onPressedChange={handleChange}>Toggle</Toggle>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('applies variant styles', () => {
    const { container: outline } = render(<Toggle variant="outline">Outline</Toggle>);
    expect(outline.firstChild).toHaveClass('border');
  });

  it('applies size styles', () => {
    const { container: sm } = render(<Toggle size="sm">Small</Toggle>);
    expect(sm.firstChild).toHaveClass('h-9');

    const { container: lg } = render(<Toggle size="lg">Large</Toggle>);
    expect(lg.firstChild).toHaveClass('h-11');
  });

  it('has data-state attribute for styling', () => {
    render(<Toggle defaultPressed>On</Toggle>);
    const button = screen.getByRole('button');
    // Tailwind uses data-[state=on]: prefix for styling, we verify the attribute exists
    expect(button).toHaveAttribute('data-state', 'on');
  });

  it('disables correctly', () => {
    render(<Toggle disabled>Disabled</Toggle>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false'); // State unchanged
  });

  it('merges custom className', () => {
    const { container } = render(<Toggle className="custom">Test</Toggle>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
