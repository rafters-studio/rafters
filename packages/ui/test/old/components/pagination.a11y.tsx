import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../src/old/ui/pagination';

describe('Pagination - Accessibility', () => {
  it('has no accessibility violations with proper structure', async () => {
    const { container } = render(
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
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with current page indication', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has aria-current="page" on active link', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const currentPage = container.querySelector('[aria-current="page"]');
    expect(currentPage).toBeInTheDocument();
    expect(currentPage).toHaveTextContent('2');
  });

  it('ellipsis is hidden from screen readers', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const ellipsis = container.querySelector('[aria-hidden="true"]');
    expect(ellipsis).toBeInTheDocument();
  });

  it('has no violations with ellipsis for truncation', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
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
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('nav element has correct aria-label', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const nav = container.querySelector('nav');
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('uses proper semantic structure with ul and li', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const nav = container.querySelector('nav');
    const ul = nav?.querySelector('ul');
    const lis = ul?.querySelectorAll('li');

    expect(nav).toBeInTheDocument();
    expect(ul).toBeInTheDocument();
    expect(lis?.length).toBeGreaterThan(0);
  });

  it('has no violations with disabled previous button', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => {}} isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => {}} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with disabled next button', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => {}} isActive>
              10
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => {}} disabled />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('previous button has descriptive aria-label', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/1" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const prev = container.querySelector('a');
    expect(prev).toHaveAttribute('aria-label', 'Go to previous page');
  });

  it('next button has descriptive aria-label', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href="/page/2" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const next = container.querySelector('a');
    expect(next).toHaveAttribute('aria-label', 'Go to next page');
  });

  it('has no violations with long pagination trail', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/page/4" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/2">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/3">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/4">4</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/5" isActive>
              5
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/6">6</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="/page/7">7</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/page/6" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with asChild links', async () => {
    const CustomLink = React.forwardRef<
      HTMLAnchorElement,
      { to: string; children: React.ReactNode }
    >(({ to, children, ...props }, ref) => (
      <a ref={ref} href={to} {...props}>
        {children}
      </a>
    ));
    CustomLink.displayName = 'CustomLink';

    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink asChild>
              <CustomLink to="/page/1">1</CustomLink>
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink asChild isActive>
              <CustomLink to="/page/2">2</CustomLink>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('disabled links have aria-disabled', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1" disabled>
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('aria-disabled', 'true');
  });

  it('focus is visible on interactive elements', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = container.querySelector('a');
    expect(link).toHaveClass('focus-visible:ring-2');
  });

  it('has no violations when all buttons are disabled at boundaries', async () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => {}} isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => {}} disabled />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
