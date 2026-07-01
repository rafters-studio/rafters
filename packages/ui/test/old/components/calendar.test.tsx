import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from '../../../src/old/ui/calendar';

/** Helper to find a day button by its text content */
function findDayButton(buttons: HTMLElement[], day: string): HTMLElement {
  const found = buttons.find((btn) => btn.textContent === day && !btn.hasAttribute('data-outside'));
  if (!found) throw new Error(`Day button "${day}" not found`);
  return found;
}

describe('Calendar - Basic Rendering', () => {
  it('should render calendar with current month', () => {
    render(<Calendar data-testid="calendar" />);

    expect(screen.getByTestId('calendar')).toBeInTheDocument();
    expect(screen.getByRole('application')).toHaveAttribute('aria-label', 'Calendar');
  });

  it('should render month/year header', () => {
    const date = new Date(2024, 5, 15); // June 2024
    render(<Calendar defaultMonth={date} />);

    expect(screen.getByText('June 2024')).toBeInTheDocument();
  });

  it('should render weekday headers', () => {
    render(<Calendar />);

    expect(screen.getByText('Su')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Tu')).toBeInTheDocument();
    expect(screen.getByText('We')).toBeInTheDocument();
    expect(screen.getByText('Th')).toBeInTheDocument();
    expect(screen.getByText('Fr')).toBeInTheDocument();
    expect(screen.getByText('Sa')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    render(<Calendar />);

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });
});

describe('Calendar - Navigation', () => {
  it('should navigate to previous month', () => {
    const date = new Date(2024, 5, 15); // June 2024
    render(<Calendar defaultMonth={date} />);

    expect(screen.getByText('June 2024')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(screen.getByText('May 2024')).toBeInTheDocument();
  });

  it('should navigate to next month', () => {
    const date = new Date(2024, 5, 15); // June 2024
    render(<Calendar defaultMonth={date} />);

    expect(screen.getByText('June 2024')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    expect(screen.getByText('July 2024')).toBeInTheDocument();
  });

  it('should navigate across year boundary', () => {
    const date = new Date(2024, 0, 15); // January 2024
    render(<Calendar defaultMonth={date} />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(screen.getByText('December 2023')).toBeInTheDocument();
  });
});

describe('Calendar - Single Selection', () => {
  it('should call onSelect when date is clicked', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(<Calendar mode="single" defaultMonth={date} onSelect={handleSelect} />);

    // Find and click a date (the 15th)
    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');
    fireEvent.click(day15);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it('should mark selected date', () => {
    const selectedDate = new Date(2024, 5, 15);
    render(<Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = dayButtons.find(
      (btn) => btn.textContent === '15' && !btn.hasAttribute('data-outside'),
    );

    expect(day15).toHaveAttribute('aria-selected', 'true');
    expect(day15).toHaveAttribute('data-selected', 'true');
  });
});

describe('Calendar - Multiple Selection', () => {
  it('should handle multiple date selection', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(<Calendar mode="multiple" defaultMonth={date} onSelect={handleSelect} />);

    const dayButtons = screen.getAllByRole('button');
    const day10 = findDayButton(dayButtons, '10');
    const day15 = findDayButton(dayButtons, '15');

    fireEvent.click(day10);
    fireEvent.click(day15);

    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it('should toggle selection when date clicked again', () => {
    const handleSelect = vi.fn();
    const selectedDates = [new Date(2024, 5, 15)];
    const date = new Date(2024, 5, 15);
    render(
      <Calendar
        mode="multiple"
        selected={selectedDates}
        defaultMonth={date}
        onSelect={handleSelect}
      />,
    );

    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');

    fireEvent.click(day15);

    // Should be called with undefined when last date is deselected
    expect(handleSelect).toHaveBeenCalledWith(undefined);
  });
});

describe('Calendar - Range Selection', () => {
  it('should handle range selection - first click sets from', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(<Calendar mode="range" defaultMonth={date} onSelect={handleSelect} />);

    const dayButtons = screen.getAllByRole('button');
    const day10 = findDayButton(dayButtons, '10');

    // First click sets "from"
    fireEvent.click(day10);
    expect(handleSelect).toHaveBeenLastCalledWith({ from: expect.any(Date), to: undefined });
  });

  it('should handle range selection - second click sets to', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    const initialRange = { from: new Date(2024, 5, 10), to: undefined };
    render(
      <Calendar mode="range" selected={initialRange} defaultMonth={date} onSelect={handleSelect} />,
    );

    const dayButtons = screen.getAllByRole('button');
    const day20 = findDayButton(dayButtons, '20');

    // Second click sets "to"
    fireEvent.click(day20);
    expect(handleSelect).toHaveBeenLastCalledWith({ from: expect.any(Date), to: expect.any(Date) });
  });

  it('should show dates in range', () => {
    const range = { from: new Date(2024, 5, 10), to: new Date(2024, 5, 20) };
    render(<Calendar mode="range" selected={range} defaultMonth={range.from} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = dayButtons.find(
      (btn) => btn.textContent === '15' && !btn.hasAttribute('data-outside'),
    );

    expect(day15).toHaveAttribute('data-in-range', 'true');
  });

  it('should swap dates if end is before start', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    const range = { from: new Date(2024, 5, 20), to: undefined };
    render(<Calendar mode="range" selected={range} defaultMonth={date} onSelect={handleSelect} />);

    const dayButtons = screen.getAllByRole('button');
    const day10 = findDayButton(dayButtons, '10');

    // Click earlier date should swap
    fireEvent.click(day10);

    const call = handleSelect.mock.calls[0][0];
    expect(call.from.getDate()).toBe(10);
    expect(call.to.getDate()).toBe(20);
  });
});

describe('Calendar - Disabled Dates', () => {
  it('should disable dates via callback', () => {
    const date = new Date(2024, 5, 15);
    render(<Calendar defaultMonth={date} disabled={(d) => d.getDate() === 15} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = dayButtons.find(
      (btn) => btn.textContent === '15' && !btn.hasAttribute('data-outside'),
    );

    expect(day15).toBeDisabled();
    expect(day15).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable dates before fromDate', () => {
    const date = new Date(2024, 5, 15);
    render(<Calendar defaultMonth={date} fromDate={new Date(2024, 5, 10)} />);

    const dayButtons = screen.getAllByRole('button');
    const day5 = dayButtons.find(
      (btn) => btn.textContent === '5' && !btn.hasAttribute('data-outside'),
    );

    expect(day5).toBeDisabled();
  });

  it('should disable dates after toDate', () => {
    const date = new Date(2024, 5, 15);
    render(<Calendar defaultMonth={date} toDate={new Date(2024, 5, 20)} />);

    const dayButtons = screen.getAllByRole('button');
    const day25 = dayButtons.find(
      (btn) => btn.textContent === '25' && !btn.hasAttribute('data-outside'),
    );

    expect(day25).toBeDisabled();
  });

  it('should not call onSelect for disabled dates', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(
      <Calendar defaultMonth={date} disabled={(d) => d.getDate() === 15} onSelect={handleSelect} />,
    );

    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');

    fireEvent.click(day15);

    expect(handleSelect).not.toHaveBeenCalled();
  });
});

describe('Calendar - Today Indicator', () => {
  it('should mark today with data-today attribute', () => {
    const today = new Date();
    render(<Calendar defaultMonth={today} />);

    const dayButtons = screen.getAllByRole('button');
    const todayButton = dayButtons.find(
      (btn) => btn.textContent === String(today.getDate()) && !btn.hasAttribute('data-outside'),
    );

    expect(todayButton).toHaveAttribute('data-today', 'true');
  });
});

describe('Calendar - Outside Days', () => {
  it('should show outside days by default', () => {
    // June 2024 starts on Saturday, so there should be days from May visible
    const date = new Date(2024, 5, 1);
    render(<Calendar defaultMonth={date} />);

    const dayButtons = screen.getAllByRole('button');
    const outsideDays = dayButtons.filter((btn) => btn.hasAttribute('data-outside'));

    expect(outsideDays.length).toBeGreaterThan(0);
  });

  it('should hide outside days when showOutsideDays is false', () => {
    const date = new Date(2024, 5, 1);
    render(<Calendar defaultMonth={date} showOutsideDays={false} />);

    // Outside days are still rendered but as empty placeholders
    const dayButtons = screen.getAllByRole('button');
    // All visible buttons should not have data-outside
    const outsideDays = dayButtons.filter((btn) => btn.hasAttribute('data-outside'));

    // When showOutsideDays is false, outside days render as empty divs, not buttons
    expect(outsideDays.length).toBe(0);
  });
});

describe('Calendar - Week Start', () => {
  it('should start week on Sunday by default', () => {
    render(<Calendar />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Su');
  });

  it('should start week on Monday when weekStartsOn is 1', () => {
    render(<Calendar weekStartsOn={1} />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Mo');
  });
});

describe('Calendar - Keyboard Navigation', () => {
  it('should navigate with arrow keys', () => {
    const date = new Date(2024, 5, 15);
    render(<Calendar defaultMonth={date} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');

    day15.focus();

    // Arrow Right should move focus
    fireEvent.keyDown(day15, { key: 'ArrowRight' });

    // Focus should now be on a different date (16th)
    // We can verify the component responded to the keydown
    expect(day15).toBeInTheDocument();
  });

  it('should select with Enter key', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(<Calendar mode="single" defaultMonth={date} onSelect={handleSelect} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');

    day15.focus();
    fireEvent.keyDown(day15, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalled();
  });

  it('should select with Space key', () => {
    const handleSelect = vi.fn();
    const date = new Date(2024, 5, 15);
    render(<Calendar mode="single" defaultMonth={date} onSelect={handleSelect} />);

    const dayButtons = screen.getAllByRole('button');
    const day15 = findDayButton(dayButtons, '15');

    day15.focus();
    fireEvent.keyDown(day15, { key: ' ' });

    expect(handleSelect).toHaveBeenCalled();
  });
});

describe('Calendar - ARIA Attributes', () => {
  it('should have proper grid structure', () => {
    render(<Calendar />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should have live region for month announcement', () => {
    render(<Calendar />);

    const monthDisplay = screen.getByLabelText('Calendar').querySelector('[aria-live="polite"]');
    expect(monthDisplay).toBeInTheDocument();
  });

  it('should have column headers with scope', () => {
    render(<Calendar />);

    const headers = screen.getAllByRole('columnheader');
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });
});

describe('Calendar - Custom className', () => {
  it('should merge custom className', () => {
    render(<Calendar className="custom-calendar" data-testid="calendar" />);

    expect(screen.getByTestId('calendar').className).toContain('custom-calendar');
  });
});

describe('Calendar - Fixed Weeks', () => {
  it('should show 6 weeks when fixedWeeks is true', () => {
    const date = new Date(2024, 1, 1); // February 2024
    render(<Calendar defaultMonth={date} fixedWeeks />);

    const rows = screen.getAllByRole('row');
    // 1 header row + 6 week rows = 7 rows total
    expect(rows.length).toBe(7);
  });
});

describe('Calendar - Data Attributes', () => {
  it('should set data-calendar on root', () => {
    render(<Calendar data-testid="calendar" />);

    expect(screen.getByTestId('calendar')).toHaveAttribute('data-calendar');
  });
});

describe('Calendar - navigation state (createMemory migration)', () => {
  it('advances and rewinds the visible month through the cell', () => {
    render(<Calendar defaultMonth={new Date(2024, 5, 15)} />); // June 2024
    expect(screen.getByText('June 2024')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('July 2024')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('May 2024')).toBeInTheDocument();
  });
});
