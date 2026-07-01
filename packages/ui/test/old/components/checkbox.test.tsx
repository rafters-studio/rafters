import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../../../src/old/ui/checkbox';

describe('Checkbox', () => {
  it('renders as a checkbox button', () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('toggles state on click (uncontrolled)', () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(checkbox);

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('respects defaultChecked', () => {
    render(<Checkbox defaultChecked aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('works in controlled mode', () => {
    function ControlledCheckbox() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
          aria-label={checked ? 'Checked' : 'Unchecked'}
        />
      );
    }

    render(<ControlledCheckbox />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange', () => {
    const handleChange = vi.fn();
    render(<Checkbox onCheckedChange={handleChange} aria-label="Accept terms" />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('toggles on Space key', () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(checkbox, { key: ' ' });

    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('shows checkmark icon when checked', () => {
    const { container, rerender } = render(<Checkbox aria-label="Accept terms" />);

    expect(container.querySelector('svg')).not.toBeInTheDocument();

    rerender(<Checkbox checked aria-label="Accept terms" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('disables correctly', () => {
    render(<Checkbox disabled aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false'); // State unchanged
  });

  it('merges custom className', () => {
    const { container } = render(<Checkbox className="custom" aria-label="Accept terms" />);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('has data-state attribute for styling', () => {
    render(<Checkbox defaultChecked aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Checkbox ref={ref} aria-label="Accept terms" />);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('does not toggle when disabled via click', () => {
    const handleChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={handleChange} aria-label="Accept terms" />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('does not toggle when disabled via keyboard', () => {
    const handleChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={handleChange} aria-label="Accept terms" />);

    fireEvent.keyDown(screen.getByRole('checkbox'), { key: ' ' });
    expect(handleChange).not.toHaveBeenCalled();
  });
});
