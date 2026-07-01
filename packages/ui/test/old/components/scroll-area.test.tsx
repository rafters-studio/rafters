import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { ScrollArea, ScrollBar } from '../../../src/old/ui/scroll-area';

describe('ScrollArea', () => {
  it('renders children', () => {
    render(
      <ScrollArea>
        <p>Scrollable content</p>
      </ScrollArea>,
    );
    expect(screen.getByText('Scrollable content')).toBeInTheDocument();
  });

  it('applies vertical orientation by default', () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);
    expect(container.firstChild).toHaveClass('overflow-y-auto', 'overflow-x-hidden');
  });

  it('applies horizontal orientation', () => {
    const { container } = render(<ScrollArea orientation="horizontal">Content</ScrollArea>);
    expect(container.firstChild).toHaveClass('overflow-x-auto', 'overflow-y-hidden');
  });

  it('applies both orientation', () => {
    const { container } = render(<ScrollArea orientation="both">Content</ScrollArea>);
    expect(container.firstChild).toHaveClass('overflow-auto');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ScrollArea ref={ref}>Content</ScrollArea>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges custom className', () => {
    const { container } = render(<ScrollArea className="h-72 w-48">Content</ScrollArea>);
    expect(container.firstChild).toHaveClass('h-72', 'w-48');
  });

  it('passes through HTML attributes', () => {
    render(
      <ScrollArea data-testid="scroll-area" aria-label="scrollable list">
        Content
      </ScrollArea>,
    );
    const element = screen.getByTestId('scroll-area');
    expect(element).toHaveAttribute('aria-label', 'scrollable list');
  });

  it('has base styling classes', () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);
    expect(container.firstChild).toHaveClass('h-full', 'w-full');
  });

  it('renders as div element', () => {
    const { container } = render(<ScrollArea>Content</ScrollArea>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});

describe('ScrollBar', () => {
  it('renders', () => {
    const { container } = render(<ScrollBar data-testid="scrollbar" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies vertical orientation by default', () => {
    const { container } = render(<ScrollBar />);
    expect(container.firstChild).toHaveClass('h-full', 'w-2.5');
  });

  it('applies horizontal orientation', () => {
    const { container } = render(<ScrollBar orientation="horizontal" />);
    expect(container.firstChild).toHaveClass('h-2.5', 'w-full', 'flex-col');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ScrollBar ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges custom className', () => {
    const { container } = render(<ScrollBar className="custom-scrollbar" />);
    expect(container.firstChild).toHaveClass('custom-scrollbar');
  });

  it('passes through HTML attributes', () => {
    render(<ScrollBar data-testid="scrollbar" aria-hidden="true" />);
    const element = screen.getByTestId('scrollbar');
    expect(element).toHaveAttribute('aria-hidden', 'true');
  });

  it('has base styling classes', () => {
    const { container } = render(<ScrollBar />);
    expect(container.firstChild).toHaveClass(
      'flex',
      'touch-none',
      'select-none',
      'transition-colors',
    );
  });

  it('renders thumb inside track', () => {
    const { container } = render(<ScrollBar />);
    const thumb = container.querySelector('.bg-border');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveClass('rounded-full');
  });
});
