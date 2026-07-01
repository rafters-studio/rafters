import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Toggle } from '../../../src/old/ui/toggle';

describe('Toggle - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Toggle>Bold</Toggle>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when pressed', async () => {
    const { container } = render(<Toggle defaultPressed>Bold</Toggle>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct aria-pressed attribute', () => {
    const { rerender } = render(<Toggle>Test</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<Toggle pressed>Test</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('has visible focus indicator', () => {
    const { container } = render(<Toggle>Focus</Toggle>);
    expect(container.firstChild).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Toggle disabled>Disabled</Toggle>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
