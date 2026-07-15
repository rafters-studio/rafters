import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from '../../../src/old/ui/color-picker';

describe('ColorPicker', () => {
  it('renders without crash', () => {
    const { container } = render(<ColorPicker />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders area canvas, hue canvas, 3 inputs, and preview', () => {
    const { container } = render(<ColorPicker />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);

    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(3);

    // Preview swatch exists
    const preview = container.querySelector('[data-gamut-tier]');
    expect(preview).toBeInTheDocument();
  });

  it('renders with role="group"', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has aria-label="Color picker"', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Color picker');
  });

  describe('Default values', () => {
    it('uses default color when no props given', () => {
      const { container } = render(<ColorPicker />);
      const inputs = container.querySelectorAll('input');
      // Default: l=0.7, c=0.15, h=250
      expect(inputs[0]).toHaveValue('0.70');
      expect(inputs[1]).toHaveValue('0.150');
      expect(inputs[2]).toHaveValue('250');
    });

    it('respects defaultValue', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.1, h: 180 }} />);
      const inputs = container.querySelectorAll('input');
      expect(inputs[0]).toHaveValue('0.50');
      expect(inputs[1]).toHaveValue('0.100');
      expect(inputs[2]).toHaveValue('180');
    });
  });

  describe('Controlled mode', () => {
    it('displays controlled value', () => {
      const { container } = render(<ColorPicker value={{ l: 0.3, c: 0.2, h: 120 }} />);
      const inputs = container.querySelectorAll('input');
      expect(inputs[0]).toHaveValue('0.30');
      expect(inputs[1]).toHaveValue('0.200');
      expect(inputs[2]).toHaveValue('120');
    });

    it('works in controlled mode', () => {
      function ControlledPicker() {
        const [color, setColor] = useState({ l: 0.5, c: 0.1, h: 180 });
        return (
          <div>
            <ColorPicker value={color} onValueChange={setColor} />
            <span data-testid="l">{color.l.toFixed(2)}</span>
          </div>
        );
      }
      render(<ControlledPicker />);
      expect(screen.getByTestId('l')).toHaveTextContent('0.50');
    });
  });

  describe('Uncontrolled mode', () => {
    it('updates internal state on input change', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.1, h: 180 }} />);
      const inputs = container.querySelectorAll('input');
      const lInput = inputs[0];

      // Simulate typing a new lightness value
      fireEvent.input(lInput, { target: { value: '0.8' } });
      // The update effect reformats to precision (2 decimal places)
      expect(lInput).toHaveValue('0.80');
    });
  });

  describe('onValueChange', () => {
    it('fires on input change', () => {
      const handleChange = vi.fn();
      const { container } = render(
        <ColorPicker defaultValue={{ l: 0.5, c: 0.1, h: 180 }} onValueChange={handleChange} />,
      );
      const inputs = container.querySelectorAll('input');

      fireEvent.input(inputs[0], { target: { value: '0.8' } });
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ l: 0.8, c: 0.1, h: 180 }),
      );
    });
  });

  describe('Disabled state', () => {
    it('sets aria-disabled on group', () => {
      render(<ColorPicker disabled />);
      expect(screen.getByRole('group')).toHaveAttribute('aria-disabled', 'true');
    });

    it('applies disabled styles', () => {
      const { container } = render(<ColorPicker disabled />);
      expect(container.firstChild).toHaveClass('opacity-50', 'pointer-events-none');
    });

    it('disables all inputs', () => {
      const { container } = render(<ColorPicker disabled />);
      const inputs = container.querySelectorAll('input');
      for (const input of inputs) {
        expect(input).toBeDisabled();
      }
    });
  });

  describe('Styling', () => {
    it('merges custom className', () => {
      const { container } = render(<ColorPicker className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to container div', () => {
      const ref = vi.fn();
      render(<ColorPicker ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Gamut tier', () => {
    it('shows gamut tier on preview swatch', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.05, h: 180 }} />);
      const preview = container.querySelector('[data-gamut-tier]');
      expect(preview).toBeInTheDocument();
      // Low chroma should be sRGB (gold)
      expect(preview).toHaveAttribute('data-gamut-tier', 'srgb');
    });

    it('shows gamut label text', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.05, h: 180 }} />);
      expect(container.textContent).toContain('sRGB');
    });
  });

  describe('Thumb positioning', () => {
    it('positions area thumb based on color', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.2, h: 180 }} />);
      // Area thumb is the first absolute positioned div with border-white
      const areaThumb = container.querySelector('.aspect-square .rounded-full') as HTMLElement;
      expect(areaThumb).toBeInTheDocument();
      expect(areaThumb.style.left).toBe('50%');
      expect(areaThumb.style.top).toBe('50%'); // (1 - 0.2/0.4) * 100 = 50%
    });

    it('positions hue thumb based on hue', () => {
      const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.2, h: 180 }} />);
      // Hue thumb is after the hue canvas
      // Find the hue thumb (in the h-4 container)
      const hueContainer = container.querySelector('.h-4');
      const hueThumb = hueContainer?.querySelector('.rounded-full') as HTMLElement;
      expect(hueThumb).toBeInTheDocument();
      expect(hueThumb.style.left).toBe('50%'); // 180/360 * 100 = 50%
    });
  });
});
