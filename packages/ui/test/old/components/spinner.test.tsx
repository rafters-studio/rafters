import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '../../../src/old/ui/spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('h-6', 'w-6');
  });

  it('renders with sm size', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-4');
  });

  it('renders with lg size', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstChild).toHaveClass('h-8', 'w-8');
  });

  it('has aria-label for accessibility', () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label', 'Loading');
  });

  it('includes screen reader text', () => {
    render(<Spinner />);
    expect(screen.getByText('Loading')).toHaveClass('sr-only');
  });

  it('applies animation classes', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('respects prefers-reduced-motion via motion-reduce class', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('motion-reduce:animate-none');
  });

  it('merges custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through HTML attributes', () => {
    render(<Spinner data-testid="spinner" aria-busy="true" />);
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders as output element', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild?.nodeName).toBe('OUTPUT');
  });

  it('has proper base classes for spinner appearance', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild;
    expect(spinner).toHaveClass('inline-block');
    expect(spinner).toHaveClass('rounded-full');
    expect(spinner).toHaveClass('border-primary');
    expect(spinner).toHaveClass('border-r-transparent');
  });

  it('allows custom aria-label override', () => {
    render(<Spinner data-testid="spinner" aria-label="Processing" />);
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label', 'Processing');
  });
});
