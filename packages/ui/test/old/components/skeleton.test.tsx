import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '../../../src/old/ui/skeleton';

describe('Skeleton', () => {
  it('renders with base styles', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('bg-muted', 'animate-pulse');
  });

  it('applies custom className for sizing', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-32');
  });

  it('applies rounded corners by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(<Skeleton aria-hidden="true" data-testid="skeleton" />);
    expect(container.firstChild).toHaveAttribute('data-testid', 'skeleton');
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports custom rounded via className override', () => {
    const { container } = render(<Skeleton className="rounded-full" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });
});
