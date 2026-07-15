import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from '../../../src/old/ui/date-picker';

describe('DatePicker - Basic Rendering', () => {
  it('should render trigger button', () => {
    render(<DatePicker data-testid="trigger" />);

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should display placeholder when no value', () => {
    render(<DatePicker placeholder="Select date" />);

    expect(screen.getByText('Select date')).toBeInTheDocument();
  });

  it('should display default placeholder', () => {
    render(<DatePicker />);

    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('should render calendar icon', () => {
    render(<DatePicker />);

    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});

describe('DatePicker - Value Display', () => {
  it('should display formatted date when value is set', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    render(<DatePicker value={date} />);

    expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument();
  });

  it('should use custom formatDate function', () => {
    const date = new Date(2024, 5, 15);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    render(<DatePicker value={date} formatDate={formatDate} />);

    expect(screen.getByText('2024-06-15')).toBeInTheDocument();
  });

  it('should display range when mode is range', () => {
    const range = { from: new Date(2024, 5, 10), to: new Date(2024, 5, 20) };
    render(<DatePicker mode="range" value={range} />);

    expect(screen.getByText(/Jun 10, 2024.*Jun 20, 2024/)).toBeInTheDocument();
  });

  it('should display partial range', () => {
    const range = { from: new Date(2024, 5, 10), to: undefined };
    render(<DatePicker mode="range" value={range} />);

    expect(screen.getByText('Jun 10, 2024')).toBeInTheDocument();
  });
});

describe('DatePicker - Open/Close', () => {
  it('should open calendar when clicked', () => {
    render(<DatePicker data-testid="trigger" />);

    fireEvent.click(screen.getByTestId('trigger'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close calendar when clicked again', () => {
    render(<DatePicker data-testid="trigger" />);

    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should set aria-expanded when open', () => {
    render(<DatePicker data-testid="trigger" />);

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DatePicker - Selection', () => {
  it('should call onValueChange when date selected', () => {
    const handleValueChange = vi.fn();
    render(
      <DatePicker
        onValueChange={handleValueChange}
        calendarProps={{ defaultMonth: new Date(2024, 5, 1) }}
        data-testid="trigger"
      />,
    );

    // Open calendar
    fireEvent.click(screen.getByTestId('trigger'));

    // Find and click a date
    const dayButtons = screen.getAllByRole('button');
    const day15 = dayButtons.find(
      (btn) => btn.textContent === '15' && !btn.hasAttribute('data-outside'),
    );
    expect(day15).toBeDefined();
    if (day15) fireEvent.click(day15);

    expect(handleValueChange).toHaveBeenCalledWith(expect.any(Date));
  });

  it('should close after single date selection', () => {
    render(
      <DatePicker calendarProps={{ defaultMonth: new Date(2024, 5, 1) }} data-testid="trigger" />,
    );

    fireEvent.click(screen.getByTestId('trigger'));

    // Select a date
    const dayButtons = screen.getAllByRole('button');
    const day15 = dayButtons.find(
      (btn) => btn.textContent === '15' && !btn.hasAttribute('data-outside'),
    );
    if (day15) fireEvent.click(day15);

    // Calendar should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should stay open after first range selection', () => {
    render(
      <DatePicker
        mode="range"
        calendarProps={{ defaultMonth: new Date(2024, 5, 1) }}
        data-testid="trigger"
      />,
    );

    fireEvent.click(screen.getByTestId('trigger'));

    // Select first date
    const dayButtons = screen.getAllByRole('button');
    const day10 = dayButtons.find(
      (btn) => btn.textContent === '10' && !btn.hasAttribute('data-outside'),
    );
    if (day10) fireEvent.click(day10);

    // Calendar should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('DatePicker - Disabled State', () => {
  it('should disable trigger when disabled', () => {
    render(<DatePicker disabled data-testid="trigger" />);

    expect(screen.getByTestId('trigger')).toBeDisabled();
  });

  it('should not open when disabled', () => {
    render(<DatePicker disabled data-testid="trigger" />);

    fireEvent.click(screen.getByTestId('trigger'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should apply opacity when disabled', () => {
    render(<DatePicker disabled data-testid="trigger" />);

    expect(screen.getByTestId('trigger').className).toContain('opacity-50');
  });
});

describe('DatePicker - ARIA Attributes', () => {
  it('should have aria-haspopup dialog', () => {
    render(<DatePicker data-testid="trigger" />);

    expect(screen.getByTestId('trigger')).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('should have aria-controls', () => {
    render(<DatePicker data-testid="trigger" />);

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('aria-controls');
  });

  it('should have aria-modal on dialog', () => {
    render(<DatePicker data-testid="trigger" />);

    fireEvent.click(screen.getByTestId('trigger'));

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});

describe('DatePicker - Data Attributes', () => {
  it('should set data-datepicker-trigger on trigger', () => {
    render(<DatePicker data-testid="trigger" />);

    expect(screen.getByTestId('trigger')).toHaveAttribute('data-datepicker-trigger');
  });

  it('should set data-state on trigger', () => {
    render(<DatePicker data-testid="trigger" />);

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('data-state', 'closed');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('should set data-datepicker-content on content', () => {
    render(<DatePicker data-testid="trigger" />);

    fireEvent.click(screen.getByTestId('trigger'));

    expect(screen.getByRole('dialog')).toHaveAttribute('data-datepicker-content');
  });
});

describe('DatePicker - Custom className', () => {
  it('should merge custom className on trigger', () => {
    render(<DatePicker className="custom-trigger" data-testid="trigger" />);

    expect(screen.getByTestId('trigger').className).toContain('custom-trigger');
  });
});

describe('DatePicker - Calendar Props', () => {
  it('should pass calendarProps to Calendar', () => {
    const date = new Date(2024, 5, 15);
    render(
      <DatePicker
        value={date}
        calendarProps={{
          disabled: (d) => d.getDate() === 10,
        }}
        data-testid="trigger"
      />,
    );

    fireEvent.click(screen.getByTestId('trigger'));

    // Find the 10th day - should be disabled
    const dayButtons = screen.getAllByRole('button');
    const day10 = dayButtons.find(
      (btn) => btn.textContent === '10' && !btn.hasAttribute('data-outside'),
    );
    expect(day10).toBeDisabled();
  });
});

describe('DatePicker - Placeholder Style', () => {
  it('should apply muted style when no value', () => {
    render(<DatePicker data-testid="trigger" />);

    expect(screen.getByTestId('trigger').className).toContain('text-muted-foreground');
  });

  it('should not apply muted style when value is set', () => {
    render(<DatePicker value={new Date()} data-testid="trigger" />);

    expect(screen.getByTestId('trigger').className).not.toContain('text-muted-foreground');
  });
});
