import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '../../../src/old/ui/separator';

describe('Separator', () => {
  it('renders horizontal separator by default', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('h-px', 'w-full');
  });

  it('renders vertical separator', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass('h-full', 'w-px');
  });

  it('sets role="none" when decorative', () => {
    const { container } = render(<Separator decorative={true} />);
    expect(container.firstChild).toHaveAttribute('role', 'none');
  });

  it('sets role="separator" when not decorative', () => {
    const { container } = render(<Separator decorative={false} />);
    expect(container.firstChild).toHaveAttribute('role', 'separator');
  });

  it('sets aria-orientation when not decorative', () => {
    const { container } = render(<Separator decorative={false} orientation="vertical" />);
    expect(container.firstChild).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('merges custom className', () => {
    const { container } = render(<Separator className="my-4" />);
    expect(container.firstChild).toHaveClass('my-4');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(<Separator data-testid="sep" />);
    expect(container.firstChild).toHaveAttribute('data-testid', 'sep');
  });
});
