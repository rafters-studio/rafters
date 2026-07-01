import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Checkbox } from '../../../src/old/ui/checkbox';

describe('Checkbox - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Checkbox aria-label="Accept terms" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when checked', async () => {
    const { container } = render(<Checkbox defaultChecked aria-label="Accept terms" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role', () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('has correct aria-checked attribute', () => {
    const { rerender } = render(<Checkbox aria-label="Test" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');

    rerender(<Checkbox checked aria-label="Test" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('has visible focus indicator', () => {
    const { container } = render(<Checkbox aria-label="Focus" />);
    expect(container.firstChild).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Checkbox disabled aria-label="Disabled" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('checkmark icon is hidden from screen readers', () => {
    const { container } = render(<Checkbox defaultChecked aria-label="Checked" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('works with aria-labelledby', async () => {
    const { container } = render(
      <div>
        <span id="label-id">Accept terms and conditions</span>
        <Checkbox aria-labelledby="label-id" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
