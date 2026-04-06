import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../../src/components/ui/badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('applies destructive variant styles', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('applies outline variant styles', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).toHaveClass('border');
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through HTML attributes', () => {
    render(
      <Badge data-testid="badge" aria-label="status">
        Test
      </Badge>,
    );
    expect(screen.getByTestId('badge')).toHaveAttribute('aria-label', 'status');
  });

  it('applies secondary variant styles', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(container.firstChild).toHaveClass('bg-secondary');
  });

  it('applies success variant styles', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('bg-success');
  });

  it('applies warning variant styles', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    expect(container.firstChild).toHaveClass('bg-warning');
  });

  it('applies info variant styles', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    expect(container.firstChild).toHaveClass('bg-info');
  });

  it('has proper base classes', () => {
    const { container } = render(<Badge>Test</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('justify-center');
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('px-2.5');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-label-small');
    expect(badge).toHaveClass('transition-colors');
  });

  it('renders as span element', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });
});
