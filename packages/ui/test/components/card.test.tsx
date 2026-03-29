import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../src/components/ui/card';

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card data-testid="card">Card content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card.tagName).toBe('DIV');
  });

  it('applies base styles', () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-card-border');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow-sm');
  });

  it('renders as article when as="article"', () => {
    render(
      <Card as="article" data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('ARTICLE');
  });

  it('renders as section when as="section"', () => {
    render(
      <Card as="section" data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('SECTION');
  });

  it('renders as aside when as="aside"', () => {
    render(
      <Card as="aside" data-testid="card">
        Content
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('ASIDE');
  });

  it('applies interactive styles when interactive prop is true', () => {
    const { container } = render(<Card interactive>Interactive Card</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('hover:bg-card-hover');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('transition-shadow');
    expect(card).toHaveClass('duration-150');
    expect(card).toHaveClass('motion-reduce:transition-none');
    expect(card).toHaveClass('focus-visible:outline-none');
    expect(card).toHaveClass('focus-visible:ring-2');
    expect(card).toHaveClass('focus-visible:ring-ring');
    expect(card).toHaveClass('focus-visible:ring-offset-2');
  });

  it('adds tabIndex=0 when interactive', () => {
    render(
      <Card interactive data-testid="card">
        Interactive
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('does not add tabIndex when not interactive', () => {
    render(<Card data-testid="card">Static</Card>);
    const card = screen.getByTestId('card');
    expect(card).not.toHaveAttribute('tabIndex');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('bg-card');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>Content</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <Card data-testid="card" aria-label="Card container" id="my-card">
        Test
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('aria-label', 'Card container');
    expect(card).toHaveAttribute('id', 'my-card');
  });
});

describe('CardHeader', () => {
  it('renders with default styles', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.firstChild;
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('flex-col');
    expect(header).toHaveClass('gap-1.5');
    expect(header).toHaveClass('p-6');
  });

  it('merges custom className', () => {
    const { container } = render(<CardHeader className="custom">Header</CardHeader>);
    expect(container.firstChild).toHaveClass('custom');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <CardHeader data-testid="header" aria-label="Header section">
        Header
      </CardHeader>,
    );
    const header = screen.getByTestId('header');
    expect(header).toHaveAttribute('aria-label', 'Header section');
  });
});

describe('CardTitle', () => {
  it('renders as h3 by default', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title.tagName).toBe('H3');
  });

  it('renders as specified heading level', () => {
    render(
      <CardTitle as="h2" data-testid="title">
        Title
      </CardTitle>,
    );
    const title = screen.getByTestId('title');
    expect(title.tagName).toBe('H2');
  });

  it('applies default styles', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.firstChild;
    expect(title).toHaveClass('text-2xl');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('leading-none');
    expect(title).toHaveClass('tracking-tight');
  });

  it('merges custom className', () => {
    const { container } = render(<CardTitle className="custom">Title</CardTitle>);
    expect(container.firstChild).toHaveClass('custom');
    expect(container.firstChild).toHaveClass('text-2xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardDescription', () => {
  it('renders as paragraph', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc.tagName).toBe('P');
  });

  it('applies default styles', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    const desc = container.firstChild;
    expect(desc).toHaveClass('text-sm');
    expect(desc).toHaveClass('text-muted-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<CardDescription className="custom">Desc</CardDescription>);
    expect(container.firstChild).toHaveClass('custom');
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('CardContent', () => {
  it('renders with default styles', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    const content = container.firstChild;
    expect(content).toHaveClass('p-6');
    expect(content).toHaveClass('pt-0');
  });

  it('merges custom className', () => {
    const { container } = render(<CardContent className="custom">Content</CardContent>);
    expect(container.firstChild).toHaveClass('custom');
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardFooter', () => {
  it('renders with default styles', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild;
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('p-6');
    expect(footer).toHaveClass('pt-0');
  });

  it('merges custom className', () => {
    const { container } = render(<CardFooter className="custom">Footer</CardFooter>);
    expect(container.firstChild).toHaveClass('custom');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('Card composition', () => {
  it('renders a complete card with all subcomponents', () => {
    render(
      <Card as="article" data-testid="card">
        <CardHeader>
          <CardTitle data-testid="title">Test Title</CardTitle>
          <CardDescription data-testid="desc">Test Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Main content here</CardContent>
        <CardFooter data-testid="footer">Footer actions</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('Test Title');
    expect(screen.getByTestId('desc')).toHaveTextContent('Test Description');
    expect(screen.getByTestId('content')).toHaveTextContent('Main content here');
    expect(screen.getByTestId('footer')).toHaveTextContent('Footer actions');
  });
});
