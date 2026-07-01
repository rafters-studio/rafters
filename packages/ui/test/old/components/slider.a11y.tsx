import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Slider } from '../../../src/old/ui/slider';

describe('Slider - Accessibility', () => {
  it('has no accessibility violations with aria-label', async () => {
    const { container } = render(<Slider aria-label="Volume" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom value', async () => {
    const { container } = render(<Slider defaultValue={[50]} aria-label="Volume" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with range slider', async () => {
    const { container } = render(<Slider defaultValue={[25, 75]} aria-label="Price range" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Slider disabled aria-label="Disabled slider" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="slider" on thumb', () => {
    render(<Slider aria-label="Volume" />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('has correct aria-valuemin attribute', () => {
    render(<Slider min={10} aria-label="Volume" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemin', '10');
  });

  it('has correct aria-valuemax attribute', () => {
    render(<Slider max={200} aria-label="Volume" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '200');
  });

  it('has correct aria-valuenow attribute', () => {
    render(<Slider defaultValue={[42]} aria-label="Volume" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '42');
  });

  it('has data-orientation on container', () => {
    const { container } = render(<Slider orientation="horizontal" aria-label="Volume" />);
    expect(container.firstChild).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('has data-orientation=vertical when vertical', () => {
    const { container } = render(<Slider orientation="vertical" aria-label="Volume" />);
    expect(container.firstChild).toHaveAttribute('data-orientation', 'vertical');
  });

  it('has aria-orientation on thumb', () => {
    render(<Slider orientation="vertical" aria-label="Volume" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('has aria-disabled on container when disabled', () => {
    const { container } = render(<Slider disabled aria-label="Volume" />);
    expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
  });

  it('has aria-disabled on thumb when disabled', () => {
    render(<Slider disabled aria-label="Volume" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
  });

  it('has visible focus indicator', () => {
    render(<Slider aria-label="Focus test" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveClass('focus-visible:ring-2');
  });

  it('thumbs are focusable when not disabled', () => {
    render(<Slider aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('tabIndex', '0');
  });

  it('thumbs are not focusable when disabled', () => {
    render(<Slider disabled aria-label="Volume" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('tabIndex', '-1');
  });

  it('supports aria-labelledby', async () => {
    const { container } = render(
      <div>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Testing aria-labelledby pattern */}
        <label id="slider-label">Volume control</label>
        <Slider aria-labelledby="slider-label" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports aria-describedby', async () => {
    const { container } = render(
      <div>
        <Slider aria-label="Volume" aria-describedby="slider-description" />
        <p id="slider-description">Adjust the volume level from 0 to 100</p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('each thumb in range slider has correct ARIA attributes', () => {
    render(<Slider defaultValue={[25, 75]} min={0} max={100} aria-label="Price range" />);
    const sliders = screen.getAllByRole('slider');

    expect(sliders).toHaveLength(2);

    // First thumb
    expect(sliders[0]).toHaveAttribute('aria-valuemin', '0');
    expect(sliders[0]).toHaveAttribute('aria-valuemax', '100');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '25');

    // Second thumb
    expect(sliders[1]).toHaveAttribute('aria-valuemin', '0');
    expect(sliders[1]).toHaveAttribute('aria-valuemax', '100');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '75');
  });

  it('has no violations with vertical orientation', async () => {
    const { container } = render(<Slider orientation="vertical" aria-label="Vertical slider" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
