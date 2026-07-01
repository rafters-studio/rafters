import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Input } from '../../../src/old/ui/input';

describe('Input - Accessibility', () => {
  it('has no accessibility violations with aria-label', async () => {
    const { container } = render(<Input aria-label="Username" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with associated label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email-input">Email address</label>
        <Input id="email-input" type="email" />
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Input disabled aria-label="Disabled input" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when required', async () => {
    const { container } = render(<Input required aria-label="Required input" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has visible focus indicator', () => {
    render(<Input aria-label="Focus test" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus-visible:ring-2');
  });

  it('sets aria-disabled when disabled', () => {
    render(<Input disabled aria-label="Disabled" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('supports aria-describedby for error messages', async () => {
    const { container } = render(
      <div>
        <label htmlFor="password">Password</label>
        <Input
          id="password"
          type="password"
          aria-invalid="true"
          aria-describedby="password-error"
        />
        <span id="password-error">Password must be at least 8 characters</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with placeholder', async () => {
    const { container } = render(<Input aria-label="Search" placeholder="Search..." />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
