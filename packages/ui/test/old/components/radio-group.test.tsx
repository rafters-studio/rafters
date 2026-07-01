import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup, RadioGroupItem } from '../../../src/old/ui/radio-group';

describe('RadioGroup', () => {
  it('renders a radiogroup with radio items', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('shows correct checked state for defaultValue', () => {
    render(
      <RadioGroup defaultValue="option2">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    expect(radio1).toHaveAttribute('aria-checked', 'false');
    expect(radio2).toHaveAttribute('aria-checked', 'true');
  });

  it('switches selection on click (uncontrolled)', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    expect(radio1).toHaveAttribute('aria-checked', 'true');
    expect(radio2).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(radio2);

    expect(radio1).toHaveAttribute('aria-checked', 'false');
    expect(radio2).toHaveAttribute('aria-checked', 'true');
  });

  it('works in controlled mode', () => {
    function ControlledRadioGroup() {
      const [value, setValue] = useState('option1');
      return (
        <RadioGroup value={value} onValueChange={setValue}>
          <RadioGroupItem value="option1" aria-label="Option 1" />
          <RadioGroupItem value="option2" aria-label="Option 2" />
        </RadioGroup>
      );
    }

    render(<ControlledRadioGroup />);

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    expect(radio1).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(radio2);

    expect(radio1).toHaveAttribute('aria-checked', 'false');
    expect(radio2).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onValueChange', () => {
    const handleChange = vi.fn();

    render(
      <RadioGroup defaultValue="option1" onValueChange={handleChange}>
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Option 2' }));
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('supports vertical arrow key navigation', () => {
    render(
      <RadioGroup defaultValue="option1" orientation="vertical">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
        <RadioGroupItem value="option3" aria-label="Option 3" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });
    const radio3 = screen.getByRole('radio', { name: 'Option 3' });

    radio1.focus();
    expect(document.activeElement).toBe(radio1);

    // ArrowDown moves to next
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(radio2);

    // ArrowDown again
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(radio3);

    // ArrowDown wraps to first
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(radio1);

    // ArrowUp wraps to last
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(radio3);
  });

  it('supports horizontal arrow key navigation', () => {
    render(
      <RadioGroup defaultValue="option1" orientation="horizontal">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
        <RadioGroupItem value="option3" aria-label="Option 3" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });
    const radio3 = screen.getByRole('radio', { name: 'Option 3' });

    radio1.focus();
    expect(document.activeElement).toBe(radio1);

    // ArrowRight moves to next
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio2);

    // ArrowRight again
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio3);

    // ArrowRight wraps to first
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(radio1);

    // ArrowLeft wraps to last
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(radio3);
  });

  it('supports Home and End keys', () => {
    render(
      <RadioGroup defaultValue="option2">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
        <RadioGroupItem value="option3" aria-label="Option 3" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });
    const radio3 = screen.getByRole('radio', { name: 'Option 3' });

    radio2.focus();

    // Home goes to first
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Home' });
    expect(document.activeElement).toBe(radio1);

    // End goes to last
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'End' });
    expect(document.activeElement).toBe(radio3);
  });

  it('skips disabled items in keyboard navigation', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" disabled />
        <RadioGroupItem value="option3" aria-label="Option 3" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio3 = screen.getByRole('radio', { name: 'Option 3' });

    radio1.focus();

    // ArrowDown skips disabled option2
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(radio3);
  });

  it('does not switch selection when disabled item is clicked', () => {
    const handleChange = vi.fn();

    render(
      <RadioGroup defaultValue="option1" onValueChange={handleChange}>
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" disabled />
      </RadioGroup>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Option 2' }));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('disables all items when group is disabled', () => {
    render(
      <RadioGroup defaultValue="option1" disabled>
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
  });

  it('sets correct data-state on items', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    expect(radio1).toHaveAttribute('data-state', 'checked');
    expect(radio2).toHaveAttribute('data-state', 'unchecked');

    fireEvent.click(radio2);

    expect(radio1).toHaveAttribute('data-state', 'unchecked');
    expect(radio2).toHaveAttribute('data-state', 'checked');
  });

  it('shows indicator when checked', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio1 = screen.getByRole('radio', { name: 'Option 1' });
    const radio2 = screen.getByRole('radio', { name: 'Option 2' });

    // The indicator span is always rendered; visibility is data-state driven (the
    // controller toggles data-state on the button and the dot hides via
    // group-data-[state=unchecked]:hidden). Assert the reflection mechanism is wired:
    // both items carry the indicator, and the checked button drives it visible.
    expect(radio1.querySelector('[data-radio-indicator]')).toBeInTheDocument();
    expect(radio2.querySelector('[data-radio-indicator]')).toBeInTheDocument();
    expect(radio1).toHaveAttribute('data-state', 'checked');
    expect(radio2).toHaveAttribute('data-state', 'unchecked');
    expect(radio2.querySelector('[data-radio-indicator]')).toHaveClass(
      'group-data-[state=unchecked]:hidden',
    );
  });

  it('selects on Space key', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio2 = screen.getByRole('radio', { name: 'Option 2' });
    radio2.focus();

    fireEvent.keyDown(radio2, { key: ' ' });

    expect(radio2).toHaveAttribute('aria-checked', 'true');
  });

  it('selects on Enter key', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const radio2 = screen.getByRole('radio', { name: 'Option 2' });
    radio2.focus();

    fireEvent.keyDown(radio2, { key: 'Enter' });

    expect(radio2).toHaveAttribute('aria-checked', 'true');
  });

  it('merges custom className on RadioGroup', () => {
    const { container } = render(
      <RadioGroup defaultValue="option1" className="custom-group">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(container.querySelector('.custom-group')).toBeInTheDocument();
  });

  it('merges custom className on RadioGroupItem', () => {
    const { container } = render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" className="custom-item" />
      </RadioGroup>,
    );

    expect(container.querySelector('.custom-item')).toBeInTheDocument();
  });

  it('passes through additional props to RadioGroup', () => {
    render(
      <RadioGroup defaultValue="option1" data-testid="radio-group">
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(screen.getByTestId('radio-group')).toBeInTheDocument();
  });

  it('passes through additional props to RadioGroupItem', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" data-testid="radio-item" />
      </RadioGroup>,
    );

    expect(screen.getByTestId('radio-item')).toBeInTheDocument();
  });

  it('forwards ref to RadioGroup', () => {
    const ref = vi.fn();
    render(
      <RadioGroup defaultValue="option1" ref={ref}>
        <RadioGroupItem value="option1" aria-label="Option 1" />
      </RadioGroup>,
    );

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards ref to RadioGroupItem', () => {
    const ref = vi.fn();
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" ref={ref} />
      </RadioGroup>,
    );

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders with horizontal orientation', () => {
    render(
      <RadioGroup defaultValue="option1" orientation="horizontal">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-orientation', 'horizontal');
    expect(group).toHaveClass('flex');
  });

  it('renders with vertical orientation by default', () => {
    render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" aria-label="Option 1" />
        <RadioGroupItem value="option2" aria-label="Option 2" />
      </RadioGroup>,
    );

    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-orientation', 'vertical');
    expect(group).toHaveClass('grid');
  });
});
