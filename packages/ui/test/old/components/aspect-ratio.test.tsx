import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { AspectRatio } from '../../../src/old/ui/aspect-ratio';

describe('AspectRatio', () => {
  it('renders with default ratio (1:1)', () => {
    const { container } = render(
      <AspectRatio>
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '1' });
  });

  it('applies custom ratio via style', () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: `${16 / 9}` });
  });

  it('renders children inside the container', () => {
    render(
      <AspectRatio ratio={4 / 3}>
        <img src="/test.jpg" alt="Sample visual content" />
      </AspectRatio>,
    );
    expect(screen.getByRole('img', { name: 'Sample visual content' })).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <AspectRatio ref={ref}>
        <div>Content</div>
      </AspectRatio>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass('relative', 'w-full');
  });

  it('merges className with base classes', () => {
    const { container } = render(
      <AspectRatio className="rounded-lg overflow-hidden">
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveClass('relative', 'w-full', 'rounded-lg', 'overflow-hidden');
  });

  it('applies base positioning classes', () => {
    const { container } = render(
      <AspectRatio>
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveClass('relative', 'w-full');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(
      <AspectRatio data-testid="aspect-container" aria-label="Image container">
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveAttribute('data-testid', 'aspect-container');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Image container');
  });

  it('merges custom style with aspectRatio', () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9} style={{ backgroundColor: 'red' }}>
        <img src="/test.jpg" alt="Test" />
      </AspectRatio>,
    );
    expect(container.firstChild).toHaveStyle({
      aspectRatio: `${16 / 9}`,
      backgroundColor: 'red',
    });
  });

  it('supports common aspect ratios', () => {
    const ratios = [
      { name: 'square', value: 1 },
      { name: '4:3', value: 4 / 3 },
      { name: '16:9', value: 16 / 9 },
      { name: '21:9', value: 21 / 9 },
    ];

    for (const { name, value } of ratios) {
      const { container } = render(
        <AspectRatio ratio={value}>
          <div>{name}</div>
        </AspectRatio>,
      );
      expect(container.firstChild).toHaveStyle({ aspectRatio: `${value}` });
    }
  });
});
