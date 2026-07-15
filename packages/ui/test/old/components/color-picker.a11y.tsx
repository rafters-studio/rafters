import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ColorPicker } from '../../../src/old/ui/color-picker';

describe('ColorPicker - Accessibility', () => {
  it('has no accessibility violations on default render', async () => {
    const { container } = render(<ColorPicker />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<ColorPicker disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom value', async () => {
    const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.1, h: 180 }} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has role="group" on container', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('has aria-label="Color picker" on container', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Color picker');
  });

  it('has aria-disabled on group when disabled', () => {
    render(<ColorPicker disabled />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not have aria-disabled when enabled', () => {
    render(<ColorPicker />);
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-disabled');
  });

  it('inputs have aria-label per channel', () => {
    const { container } = render(<ColorPicker />);
    const inputs = container.querySelectorAll('input');
    expect(inputs[0]).toHaveAttribute('aria-label', 'Lightness');
    expect(inputs[1]).toHaveAttribute('aria-label', 'Chroma');
    expect(inputs[2]).toHaveAttribute('aria-label', 'Hue');
  });

  it('inputs have inputmode="decimal"', () => {
    const { container } = render(<ColorPicker />);
    const inputs = container.querySelectorAll('input');
    for (const input of inputs) {
      expect(input).toHaveAttribute('inputmode', 'decimal');
    }
  });

  it('inputs have min/max/step attributes', () => {
    const { container } = render(<ColorPicker />);
    const inputs = container.querySelectorAll('input');

    // Lightness
    expect(inputs[0]).toHaveAttribute('min', '0');
    expect(inputs[0]).toHaveAttribute('max', '1');
    expect(inputs[0]).toHaveAttribute('step', '0.01');

    // Chroma
    expect(inputs[1]).toHaveAttribute('min', '0');
    expect(inputs[1]).toHaveAttribute('max', '0.4');
    expect(inputs[1]).toHaveAttribute('step', '0.001');

    // Hue
    expect(inputs[2]).toHaveAttribute('min', '0');
    expect(inputs[2]).toHaveAttribute('max', '360');
    expect(inputs[2]).toHaveAttribute('step', '1');
  });

  it('preview has gamut tier in data attribute', () => {
    const { container } = render(<ColorPicker defaultValue={{ l: 0.5, c: 0.05, h: 180 }} />);
    const preview = container.querySelector('[data-gamut-tier]');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('data-gamut-tier');
  });

  it('disabled inputs are marked disabled', () => {
    const { container } = render(<ColorPicker disabled />);
    const inputs = container.querySelectorAll('input');
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });

  it('focus ring classes are present on inputs', () => {
    const { container } = render(<ColorPicker />);
    const inputs = container.querySelectorAll('input');
    for (const input of inputs) {
      expect(input).toHaveClass('focus-visible:ring-2');
    }
  });
});
