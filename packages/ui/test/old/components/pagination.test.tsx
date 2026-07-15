import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../src/old/ui/pagination';

describe('Pagination', () => {
  it('renders as nav element', () => {
    render(
      <Pagination data-testid="pagination">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const nav = screen.getByTestId('pagination');
    expect(nav.tagName).toBe('NAV');
  });

  it('renders as nav element (implicit navigation role)', () => {
    render(
      <Pagination data-testid="pagination">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    // nav element has implicit role="navigation"
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has aria-label="Pagination"', () => {
    render(
      <Pagination data-testid="pagination">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('pagination')).toHaveAttribute('aria-label', 'Pagination');
  });

  it('merges custom className', () => {
    const { container } = render(
      <Pagination className="custom-class">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Pagination ref={ref}>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });
});

describe('PaginationContent', () => {
  it('renders as ul element', () => {
    render(
      <Pagination>
        <PaginationContent data-testid="content">
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const content = screen.getByTestId('content');
    expect(content.tagName).toBe('UL');
  });

  it('has proper base classes', () => {
    render(
      <Pagination>
        <PaginationContent data-testid="content">
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('flex');
    expect(content).toHaveClass('flex-row');
    expect(content).toHaveClass('items-center');
    expect(content).toHaveClass('gap-1');
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent data-testid="content" className="custom-class">
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('content')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLUListElement>();
    render(
      <Pagination>
        <PaginationContent ref={ref}>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(ref.current).toBeInstanceOf(HTMLUListElement);
  });
});

describe('PaginationItem', () => {
  it('renders as li element', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem data-testid="item">
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const item = screen.getByTestId('item');
    expect(item.tagName).toBe('LI');
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem data-testid="item" className="custom-class">
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('item')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLLIElement>();
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem ref={ref}>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(ref.current).toBeInstanceOf(HTMLLIElement);
  });
});

describe('PaginationLink', () => {
  it('renders as anchor element when href is provided', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link.tagName).toBe('A');
  });

  it('renders as button element when onClick is provided without href', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink onClick={() => {}} data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link.tagName).toBe('BUTTON');
  });

  it('has proper base classes', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('inline-flex');
    expect(link).toHaveClass('items-center');
    expect(link).toHaveClass('justify-center');
    expect(link).toHaveClass('rounded-md');
  });

  it('passes through href attribute', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/2" data-testid="link">
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).toHaveAttribute('href', '/page/2');
  });

  it('sets aria-current="page" when isActive', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" isActive data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current when not active', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).not.toHaveAttribute('aria-current');
  });

  it('applies active styles when isActive', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" isActive data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('bg-primary');
    expect(link).toHaveClass('text-primary-foreground');
  });

  it('applies inactive styles when not active', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('bg-transparent');
    expect(link).toHaveClass('text-foreground');
  });

  it('handles onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink onClick={handleClick} data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    await user.click(screen.getByTestId('link'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('applies disabled styles when disabled', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" disabled data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('pointer-events-none');
    expect(link).toHaveClass('opacity-50');
  });

  it('sets aria-disabled when disabled', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" disabled data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables button when disabled', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink onClick={() => {}} disabled data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).toBeDisabled();
  });

  it('applies size classes', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" size="lg" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('h-11');
    expect(link).toHaveClass('min-w-11');
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" className="custom-class" data-testid="link">
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('link')).toHaveClass('custom-class');
  });

  it('supports asChild prop for custom link components', () => {
    const CustomLink = React.forwardRef<
      HTMLAnchorElement,
      { to: string; children: React.ReactNode }
    >(({ to, children, ...props }, ref) => (
      <a ref={ref} href={to} {...props}>
        {children}
      </a>
    ));
    CustomLink.displayName = 'CustomLink';

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink asChild data-testid="link">
              <CustomLink to="/page/2">2</CustomLink>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = screen.getByText('2');
    expect(link).toHaveAttribute('href', '/page/2');
    expect(link).toHaveClass('inline-flex');
  });
});

describe('PaginationPrevious', () => {
  it('renders with default label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('prev')).toHaveTextContent('Previous');
  });

  it('renders with custom label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" label="Back" data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('prev')).toHaveTextContent('Back');
  });

  it('has aria-label for accessibility', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('prev')).toHaveAttribute('aria-label', 'Go to previous page');
  });

  it('renders chevron icon', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const svg = screen.getByTestId('prev').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} disabled data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('prev')).toBeDisabled();
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" className="custom-class" data-testid="prev" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('prev')).toHaveClass('custom-class');
  });
});

describe('PaginationNext', () => {
  it('renders with default label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('next')).toHaveTextContent('Next');
  });

  it('renders with custom label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" label="Forward" data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('next')).toHaveTextContent('Forward');
  });

  it('has aria-label for accessibility', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('next')).toHaveAttribute('aria-label', 'Go to next page');
  });

  it('renders chevron icon', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const svg = screen.getByTestId('next').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext onClick={() => {}} disabled data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('next')).toBeDisabled();
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" className="custom-class" data-testid="next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('next')).toHaveClass('custom-class');
  });
});

describe('PaginationEllipsis', () => {
  it('renders as span element', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    expect(ellipsis.tagName).toBe('SPAN');
  });

  it('has aria-hidden="true"', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('ellipsis')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has screen reader text', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByText('More pages')).toHaveClass('sr-only');
  });

  it('has proper base classes', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    expect(ellipsis).toHaveClass('flex');
    expect(ellipsis).toHaveClass('h-9');
    expect(ellipsis).toHaveClass('w-9');
    expect(ellipsis).toHaveClass('items-center');
    expect(ellipsis).toHaveClass('justify-center');
  });

  it('renders ellipsis icon', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    const svg = ellipsis.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis data-testid="ellipsis" className="custom-class" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByTestId('ellipsis')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis ref={ref} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

describe('Pagination - Full integration', () => {
  it('renders a complete pagination with links', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/3">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/page/3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  it('renders with ellipsis for truncation', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/4" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/5" isActive>
              5
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/10">10</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/page/6" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByText('More pages').length).toBe(2);
  });

  it('renders button-style pagination with onClick handlers', async () => {
    const user = userEvent.setup();
    const handlePrev = vi.fn();
    const handleNext = vi.fn();
    const handlePage = vi.fn();

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={handlePrev} disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => handlePage(1)} isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => handlePage(2)}>2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={handleNext} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    // Previous should be disabled
    expect(screen.getByText('Previous').closest('button')).toBeDisabled();

    // Click on page 2
    await user.click(screen.getByText('2'));
    expect(handlePage).toHaveBeenCalledWith(2);

    // Click next
    await user.click(screen.getByText('Next'));
    expect(handleNext).toHaveBeenCalled();
  });

  it('supports mixed link and button navigation', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={handleClick} isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/page/3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    // Link-style has href
    expect(screen.getByText('1')).toHaveAttribute('href', '/page/1');

    // Button-style has onClick
    await user.click(screen.getByText('2'));
    expect(handleClick).toHaveBeenCalled();
  });
});
