import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Switch } from '../../../src/old/ui/switch';

describe('Switch - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Switch aria-label="Toggle feature" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when checked', async () => {
    const { container } = render(<Switch defaultChecked aria-label="Toggle feature" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct role="switch"', () => {
    render(<Switch aria-label="Toggle feature" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('has correct aria-checked attribute', () => {
    const { rerender } = render(<Switch aria-label="Toggle feature" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked aria-label="Toggle feature" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('has visible focus indicator', () => {
    const { container } = render(<Switch aria-label="Focus test" />);
    expect(container.firstChild).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Switch disabled aria-label="Disabled switch" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports aria-labelledby', async () => {
    const { container } = render(
      <div>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: Testing aria-labelledby pattern */}
        <label id="switch-label">Enable notifications</label>
        <Switch aria-labelledby="switch-label" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports aria-describedby', async () => {
    const { container } = render(
      <div>
        <Switch aria-label="Enable dark mode" aria-describedby="switch-description" />
        <p id="switch-description">Enables dark color scheme for the app</p>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
