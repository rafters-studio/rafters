import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from '../../../src/old/ui/slider';

describe('Slider', () => {
  it('renders with slider role', () => {
    render(<Slider aria-label="Volume" />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with default value of 0', () => {
    render(<Slider aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('respects defaultValue', () => {
    render(<Slider defaultValue={[50]} aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('respects controlled value', () => {
    render(<Slider value={[75]} aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '75');
  });

  it('works in controlled mode', () => {
    function ControlledSlider() {
      const [value, setValue] = useState([25]);
      return (
        <div>
          <Slider value={value} onValueChange={setValue} aria-label="Volume" />
          <span data-testid="value">{value[0]}</span>
        </div>
      );
    }

    render(<ControlledSlider />);
    expect(screen.getByTestId('value')).toHaveTextContent('25');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '25');
  });

  it('renders min and max attributes', () => {
    render(<Slider min={10} max={90} aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '10');
    expect(slider).toHaveAttribute('aria-valuemax', '90');
  });

  it('renders two thumbs for range slider', () => {
    render(<Slider defaultValue={[25, 75]} aria-label="Price range" />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '25');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '75');
  });

  describe('Keyboard navigation', () => {
    it('increases value with ArrowRight', () => {
      const handleChange = vi.fn();
      render(<Slider defaultValue={[50]} onValueChange={handleChange} aria-label="Volume" />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith([51]);
    });

    it('increases value with ArrowUp', () => {
      const handleChange = vi.fn();
      render(<Slider defaultValue={[50]} onValueChange={handleChange} aria-label="Volume" />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowUp' });
      expect(handleChange).toHaveBeenCalledWith([51]);
    });

    it('decreases value with ArrowLeft', () => {
      const handleChange = vi.fn();
      render(<Slider defaultValue={[50]} onValueChange={handleChange} aria-label="Volume" />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalledWith([49]);
    });

    it('decreases value with ArrowDown', () => {
      const handleChange = vi.fn();
      render(<Slider defaultValue={[50]} onValueChange={handleChange} aria-label="Volume" />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowDown' });
      expect(handleChange).toHaveBeenCalledWith([49]);
    });

    it('increases by 10x step with PageUp', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[50]} step={1} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'PageUp' });
      expect(handleChange).toHaveBeenCalledWith([60]);
    });

    it('decreases by 10x step with PageDown', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[50]} step={1} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'PageDown' });
      expect(handleChange).toHaveBeenCalledWith([40]);
    });

    it('goes to min with Home', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[50]} min={0} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'Home' });
      expect(handleChange).toHaveBeenCalledWith([0]);
    });

    it('goes to max with End', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[50]} max={100} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'End' });
      expect(handleChange).toHaveBeenCalledWith([100]);
    });

    it('respects custom step value', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[50]} step={5} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith([55]);
    });

    it('clamps value to max on ArrowRight', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[99]} max={100} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith([100]);

      // Second press should not fire callback since already at max
      handleChange.mockClear();
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('clamps value to min on ArrowLeft', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[1]} min={0} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalledWith([0]);

      // Second press should not fire callback since already at min
      handleChange.mockClear();
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled state', () => {
    it('has aria-disabled when disabled', () => {
      render(<Slider disabled aria-label="Volume" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-disabled', 'true');
    });

    it('has tabIndex -1 when disabled', () => {
      render(<Slider disabled aria-label="Volume" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabIndex', '-1');
    });

    it('does not respond to keyboard when disabled', () => {
      const handleChange = vi.fn();
      render(
        <Slider disabled defaultValue={[50]} onValueChange={handleChange} aria-label="Volume" />,
      );
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('applies disabled styles', () => {
      const { container } = render(<Slider disabled aria-label="Volume" />);
      expect(container.firstChild).toHaveClass('opacity-50', 'pointer-events-none');
    });
  });

  describe('Orientation', () => {
    it('defaults to horizontal orientation', () => {
      const { container } = render(<Slider aria-label="Volume" />);
      expect(container.firstChild).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('supports vertical orientation', () => {
      const { container } = render(<Slider orientation="vertical" aria-label="Volume" />);
      expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical');
    });

    it('passes orientation to thumbs', () => {
      render(<Slider orientation="vertical" aria-label="Volume" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  describe('Styling', () => {
    it('merges custom className', () => {
      const { container } = render(<Slider className="custom-class" aria-label="Volume" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has correct container classes', () => {
      const { container } = render(<Slider aria-label="Volume" />);
      expect(container.firstChild).toHaveClass(
        'relative',
        'flex',
        'touch-none',
        'select-none',
        'items-center',
      );
    });

    it('has focus-visible ring on thumb', () => {
      render(<Slider aria-label="Volume" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary-ring');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to container', () => {
      const ref = vi.fn();
      render(<Slider ref={ref} aria-label="Volume" />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Uncontrolled behavior', () => {
    it('updates internal state on keyboard interaction', () => {
      render(<Slider defaultValue={[50]} aria-label="Volume" />);
      const slider = screen.getByRole('slider');

      expect(slider).toHaveAttribute('aria-valuenow', '50');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(slider).toHaveAttribute('aria-valuenow', '51');
    });
  });

  describe('Range slider keyboard navigation', () => {
    it('updates correct thumb on keyboard', () => {
      const handleChange = vi.fn();
      render(
        <Slider defaultValue={[25, 75]} onValueChange={handleChange} aria-label="Price range" />,
      );
      const sliders = screen.getAllByRole('slider');

      // Move first thumb
      fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith([26, 75]);
    });
  });
});
