import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '../../src/components/ui/toggle-group';

describe('ToggleGroup', () => {
  describe('Single mode', () => {
    it('renders items', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('selects item on click', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      expect(buttonA).toHaveAttribute('aria-pressed', 'false');
      expect(buttonA).toHaveAttribute('data-state', 'off');

      fireEvent.click(buttonA);

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');
      expect(buttonA).toHaveAttribute('data-state', 'on');
      expect(buttonB).toHaveAttribute('aria-pressed', 'false');
    });

    it('deselects when clicking selected item', () => {
      render(
        <ToggleGroup type="single" defaultValue="a">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(buttonA);

      expect(buttonA).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches selection when clicking another item', () => {
      render(
        <ToggleGroup type="single" defaultValue="a">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');
      expect(buttonB).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(buttonB);

      expect(buttonA).toHaveAttribute('aria-pressed', 'false');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onValueChange with string value', () => {
      const handleChange = vi.fn();

      render(
        <ToggleGroup type="single" onValueChange={handleChange}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(handleChange).toHaveBeenCalledWith('a');

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(handleChange).toHaveBeenCalledWith('');
    });

    it('works in controlled mode', () => {
      function ControlledSingleToggle() {
        const [value, setValue] = useState('');
        return (
          <ToggleGroup type="single" value={value} onValueChange={(v) => setValue(v as string)}>
            <ToggleGroupItem value="a">A</ToggleGroupItem>
            <ToggleGroupItem value="b">B</ToggleGroupItem>
          </ToggleGroup>
        );
      }

      render(<ControlledSingleToggle />);

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      expect(buttonA).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(buttonA);
      expect(buttonA).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(buttonB);
      expect(buttonA).toHaveAttribute('aria-pressed', 'false');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Multiple mode', () => {
    it('allows multiple selections', () => {
      render(
        <ToggleGroup type="multiple">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      fireEvent.click(buttonA);
      fireEvent.click(buttonB);

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles individual items without affecting others', () => {
      render(
        <ToggleGroup type="multiple" defaultValue={['a', 'b']}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(buttonA);

      expect(buttonA).toHaveAttribute('aria-pressed', 'false');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onValueChange with array value', () => {
      const handleChange = vi.fn();

      render(
        <ToggleGroup type="multiple" onValueChange={handleChange}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(handleChange).toHaveBeenCalledWith(['a']);

      fireEvent.click(screen.getByRole('button', { name: 'B' }));
      expect(handleChange).toHaveBeenCalledWith(['a', 'b']);

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(handleChange).toHaveBeenCalledWith(['b']);
    });

    it('works in controlled mode', () => {
      function ControlledMultipleToggle() {
        const [value, setValue] = useState<string[]>([]);
        return (
          <ToggleGroup type="multiple" value={value} onValueChange={(v) => setValue(v as string[])}>
            <ToggleGroupItem value="a">A</ToggleGroupItem>
            <ToggleGroupItem value="b">B</ToggleGroupItem>
          </ToggleGroup>
        );
      }

      render(<ControlledMultipleToggle />);

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });

      fireEvent.click(buttonA);
      fireEvent.click(buttonB);

      expect(buttonA).toHaveAttribute('aria-pressed', 'true');
      expect(buttonB).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Keyboard navigation', () => {
    it('supports arrow key navigation', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });
      const buttonC = screen.getByRole('button', { name: 'C' });

      buttonA.focus();
      expect(document.activeElement).toBe(buttonA);

      fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttonB);

      fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttonC);

      // Wraps to first
      fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttonA);

      // Wraps to last
      fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(buttonC);
    });

    it('supports Home and End keys', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonB = screen.getByRole('button', { name: 'B' });
      const buttonC = screen.getByRole('button', { name: 'C' });

      buttonB.focus();

      fireEvent.keyDown(screen.getByRole('group'), { key: 'Home' });
      expect(document.activeElement).toBe(buttonA);

      fireEvent.keyDown(screen.getByRole('group'), { key: 'End' });
      expect(document.activeElement).toBe(buttonC);
    });

    it('skips disabled items in navigation', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b" disabled>
            B
          </ToggleGroupItem>
          <ToggleGroupItem value="c">C</ToggleGroupItem>
        </ToggleGroup>,
      );

      const buttonA = screen.getByRole('button', { name: 'A' });
      const buttonC = screen.getByRole('button', { name: 'C' });

      buttonA.focus();

      fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
      expect(document.activeElement).toBe(buttonC);
    });
  });

  describe('Variants and sizes', () => {
    it('applies default variant styles', () => {
      const { container } = render(
        <ToggleGroup type="single" defaultValue="a">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(container.querySelector('[role="group"]')).toHaveClass('bg-muted', 'p-1');
      // Pressed styling is now data-state driven (the controller toggles data-state),
      // so the class string carries the state variants rather than the bare utilities.
      expect(screen.getByRole('button')).toHaveClass(
        'data-[state=on]:bg-background',
        'data-[state=on]:shadow-sm',
      );
    });

    it('applies outline variant styles', () => {
      render(
        <ToggleGroup type="single" variant="outline" defaultValue="a">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'data-[state=on]:bg-accent');
    });

    it('applies size styles', () => {
      const { rerender } = render(
        <ToggleGroup type="single" size="sm">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button')).toHaveClass('h-8', 'px-2');

      rerender(
        <ToggleGroup type="single" size="lg">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4');
    });

    it('applies default size', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3');
    });
  });

  describe('Disabled state', () => {
    it('disables all items when group is disabled', () => {
      render(
        <ToggleGroup type="single" disabled>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'B' })).toBeDisabled();
    });

    it('disables individual items', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b" disabled>
            B
          </ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button', { name: 'A' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'B' })).toBeDisabled();
    });

    it('does not toggle disabled items on click', () => {
      const handleChange = vi.fn();

      render(
        <ToggleGroup type="single" onValueChange={handleChange}>
          <ToggleGroupItem value="a" disabled>
            A
          </ToggleGroupItem>
        </ToggleGroup>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Orientation', () => {
    it('sets horizontal orientation by default', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('sets vertical orientation when specified', () => {
      render(
        <ToggleGroup type="single" orientation="vertical">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'vertical');
    });
  });

  describe('Props and className', () => {
    it('merges custom className on group', () => {
      const { container } = render(
        <ToggleGroup type="single" className="custom-group">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(container.querySelector('.custom-group')).toBeInTheDocument();
    });

    it('merges custom className on items', () => {
      render(
        <ToggleGroup type="single">
          <ToggleGroupItem value="a" className="custom-item">
            A
          </ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button')).toHaveClass('custom-item');
    });

    it('passes through additional props', () => {
      render(
        <ToggleGroup type="single" data-testid="group">
          <ToggleGroupItem value="a" data-testid="item">
            A
          </ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByTestId('group')).toBeInTheDocument();
      expect(screen.getByTestId('item')).toBeInTheDocument();
    });
  });

  describe('Data attributes', () => {
    it('sets data-state on items correctly', () => {
      render(
        <ToggleGroup type="single" defaultValue="a">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>,
      );

      expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('data-state', 'on');
      expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('data-state', 'off');

      fireEvent.click(screen.getByRole('button', { name: 'B' }));

      expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('data-state', 'off');
      expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('data-state', 'on');
    });
  });
});
