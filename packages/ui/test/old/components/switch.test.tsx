import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../../../src/old/ui/switch';

describe('Switch', () => {
  it('renders as a switch role', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggles state on click (uncontrolled)', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(switchEl).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(switchEl);

    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(switchEl).toHaveAttribute('data-state', 'checked');
  });

  it('respects defaultChecked', () => {
    render(<Switch defaultChecked />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(switchEl).toHaveAttribute('data-state', 'checked');
  });

  it('works in controlled mode', () => {
    function ControlledSwitch() {
      const [checked, setChecked] = useState(false);
      return (
        <div>
          <Switch checked={checked} onCheckedChange={setChecked} />
          <span data-testid="status">{checked ? 'On' : 'Off'}</span>
        </div>
      );
    }

    render(<ControlledSwitch />);
    const switchEl = screen.getByRole('switch');

    expect(screen.getByTestId('status')).toHaveTextContent('Off');
    fireEvent.click(switchEl);
    expect(screen.getByTestId('status')).toHaveTextContent('On');
  });

  it('calls onCheckedChange', () => {
    const handleChange = vi.fn();
    render(<Switch onCheckedChange={handleChange} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('toggles on Space key', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(switchEl, { key: ' ' });

    expect(switchEl).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(switchEl, { key: ' ' });

    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('disables correctly', () => {
    render(<Switch disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'false'); // State unchanged
  });

  it('does not toggle on Space key when disabled', () => {
    render(<Switch disabled />);
    const switchEl = screen.getByRole('switch');

    fireEvent.keyDown(switchEl, { key: ' ' });
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('merges custom className', () => {
    const { container } = render(<Switch className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Switch ref={ref} />);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('has thumb that moves on toggle', () => {
    const { container } = render(<Switch />);
    const thumb = container.querySelector('span');

    expect(thumb).toHaveClass('translate-x-0');

    fireEvent.click(screen.getByRole('switch'));

    expect(thumb).toHaveClass('translate-x-5');
  });

  it('applies transition classes for smooth animation', () => {
    const { container } = render(<Switch />);
    const switchEl = screen.getByRole('switch');
    const thumb = container.querySelector('span');

    expect(switchEl).toHaveClass('transition-colors');
    expect(thumb).toHaveClass('transition-transform');
  });
});
