import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../src/components/ui/breadcrumb';

describe('Breadcrumb', () => {
  it('renders as nav element', () => {
    render(
      <Breadcrumb data-testid="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const nav = screen.getByTestId('breadcrumb');
    expect(nav.tagName).toBe('NAV');
  });

  it('has aria-label="Breadcrumb"', () => {
    render(
      <Breadcrumb data-testid="breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('breadcrumb')).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('merges custom className', () => {
    const { container } = render(
      <Breadcrumb className="custom-class">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLElement>();
    render(
      <Breadcrumb ref={ref}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });
});

describe('BreadcrumbList', () => {
  it('renders as ol element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList data-testid="list">
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const list = screen.getByTestId('list');
    expect(list.tagName).toBe('OL');
  });

  it('has proper base classes', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList data-testid="list">
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const list = screen.getByTestId('list');
    expect(list).toHaveClass('flex');
    expect(list).toHaveClass('flex-wrap');
    expect(list).toHaveClass('items-center');
    expect(list).toHaveClass('text-label-medium');
    expect(list).toHaveClass('text-muted-foreground');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList data-testid="list" className="custom-class">
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('list')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLOListElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList ref={ref}>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLOListElement);
  });
});

describe('BreadcrumbItem', () => {
  it('renders as li element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem data-testid="item">
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const item = screen.getByTestId('item');
    expect(item.tagName).toBe('LI');
  });

  it('has proper base classes', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem data-testid="item">
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const item = screen.getByTestId('item');
    expect(item).toHaveClass('inline-flex');
    expect(item).toHaveClass('items-center');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem data-testid="item" className="custom-class">
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('item')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLLIElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem ref={ref}>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLLIElement);
  });
});

describe('BreadcrumbLink', () => {
  it('renders as anchor element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" data-testid="link">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = screen.getByTestId('link');
    expect(link.tagName).toBe('A');
  });

  it('has proper base classes', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" data-testid="link">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = screen.getByTestId('link');
    expect(link).toHaveClass('transition-colors');
    expect(link).toHaveClass('hover:text-foreground');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" data-testid="link" className="custom-class">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('link')).toHaveClass('custom-class');
  });

  it('passes through href attribute', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/products" data-testid="link">
              Products
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('link')).toHaveAttribute('href', '/products');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink ref={ref} href="/">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild data-testid="link">
              <CustomLink to="/products">Products</CustomLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = screen.getByText('Products');
    expect(link).toHaveAttribute('href', '/products');
    expect(link).toHaveClass('transition-colors');
  });
});

describe('BreadcrumbPage', () => {
  it('renders as span element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const page = screen.getByTestId('page');
    expect(page.tagName).toBe('SPAN');
  });

  it('has aria-current="page"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('page')).toHaveAttribute('aria-current', 'page');
  });

  it('has aria-disabled="true"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('page')).toHaveAttribute('aria-disabled', 'true');
  });

  it('has role="link"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('page')).toHaveAttribute('role', 'link');
  });

  it('has proper base classes', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page">Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const page = screen.getByTestId('page');
    expect(page).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="page" className="custom-class">
              Current
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('page')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage ref={ref}>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

describe('BreadcrumbSeparator', () => {
  it('renders as li element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const separator = screen.getByTestId('separator');
    expect(separator.tagName).toBe('LI');
  });

  it('has aria-hidden="true"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('separator')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has role="presentation"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('separator')).toHaveAttribute('role', 'presentation');
  });

  it('renders default chevron icon when no children', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const separator = screen.getByTestId('separator');
    const svg = separator.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator">/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('separator')).toHaveTextContent('/');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="separator" className="custom-class" />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('separator')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLLIElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator ref={ref} />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLLIElement);
  });
});

describe('BreadcrumbEllipsis', () => {
  it('renders as span element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    expect(ellipsis.tagName).toBe('SPAN');
  });

  it('has aria-hidden="true"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('ellipsis')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has role="presentation"', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('ellipsis')).toHaveAttribute('role', 'presentation');
  });

  it('has screen reader text', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByText('More')).toHaveClass('sr-only');
  });

  it('has proper base classes', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    expect(ellipsis).toHaveClass('flex');
    expect(ellipsis).toHaveClass('h-9');
    expect(ellipsis).toHaveClass('w-9');
    expect(ellipsis).toHaveClass('items-center');
    expect(ellipsis).toHaveClass('justify-center');
  });

  it('merges custom className', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" className="custom-class" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('ellipsis')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis ref={ref} />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('renders ellipsis icon', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis data-testid="ellipsis" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const ellipsis = screen.getByTestId('ellipsis');
    const svg = ellipsis.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('Breadcrumb - Full integration', () => {
  it('renders a complete breadcrumb trail', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/products">Products</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Widget</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toHaveAttribute('aria-current', 'page');
  });

  it('renders with ellipsis for truncation', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument(); // sr-only text
    expect(screen.getByText('Current')).toBeInTheDocument();
  });
});
