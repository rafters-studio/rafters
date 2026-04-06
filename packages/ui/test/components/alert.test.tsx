import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '../../src/components/ui/alert';

describe('Alert', () => {
  it('renders with default props', () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Alert content')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    render(<Alert>Default</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-primary-subtle');
    expect(alert.className).toContain('text-primary-foreground');
    expect(alert.className).toContain('border-primary-border');
  });

  it('applies info variant classes', () => {
    render(<Alert variant="info">Info</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-info-subtle');
    expect(alert.className).toContain('text-info-foreground');
    expect(alert.className).toContain('border-info-border');
  });

  it('applies success variant classes', () => {
    render(<Alert variant="success">Success</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-success-subtle');
    expect(alert.className).toContain('text-success-foreground');
    expect(alert.className).toContain('border-success-border');
  });

  it('applies warning variant classes', () => {
    render(<Alert variant="warning">Warning</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-warning-subtle');
    expect(alert.className).toContain('text-warning-foreground');
    expect(alert.className).toContain('border-warning-border');
  });

  it('applies destructive variant classes', () => {
    render(<Alert variant="destructive">Destructive</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-destructive-subtle');
    expect(alert.className).toContain('text-destructive-foreground');
    expect(alert.className).toContain('border-destructive-border');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Test</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(screen.getByRole('alert'));
  });

  it('merges custom className', () => {
    render(<Alert className="custom-class">Test</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('custom-class');
    expect(alert.className).toContain('rounded-lg');
  });

  it('passes through additional props', () => {
    render(<Alert data-testid="my-alert">Test</Alert>);
    expect(screen.getByTestId('my-alert')).toBeInTheDocument();
  });
});

describe('AlertTitle', () => {
  it('renders as h5 heading', () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByRole('heading', { level: 5 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Title');
  });

  it('applies styling classes', () => {
    render(<AlertTitle>Title</AlertTitle>);
    const title = screen.getByRole('heading');
    expect(title.className).toContain('text-title-small');
    expect(title.className).toContain('leading-none');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<AlertTitle ref={ref}>Title</AlertTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('merges custom className', () => {
    render(<AlertTitle className="custom-title">Title</AlertTitle>);
    const title = screen.getByRole('heading');
    expect(title.className).toContain('custom-title');
    expect(title.className).toContain('text-title-small');
  });
});

describe('AlertDescription', () => {
  it('renders content', () => {
    render(<AlertDescription>Description text</AlertDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('applies styling classes', () => {
    render(<AlertDescription data-testid="desc">Description</AlertDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('text-body-small');
  });

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLDivElement>();
    render(<AlertDescription ref={ref}>Description</AlertDescription>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges custom className', () => {
    render(
      <AlertDescription className="custom-desc" data-testid="desc">
        Description
      </AlertDescription>,
    );
    const desc = screen.getByTestId('desc');
    expect(desc.className).toContain('custom-desc');
    expect(desc.className).toContain('text-body-small');
  });
});

describe('Alert composition', () => {
  it('renders complete alert with title and description', () => {
    render(
      <Alert variant="info">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>This is an informational message.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('Information');
    expect(screen.getByText('This is an informational message.')).toBeInTheDocument();
  });

  it('renders alert with icon slot', () => {
    render(
      <Alert>
        <svg data-testid="icon" className="h-4 w-4" />
        <div>
          <AlertTitle>With Icon</AlertTitle>
          <AlertDescription>Alert with an icon.</AlertDescription>
        </div>
      </Alert>,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('With Icon');
  });

  it('has relative positioning for icon placement', () => {
    render(<Alert data-testid="alert">Test</Alert>);
    const alert = screen.getByTestId('alert');
    // Alert uses relative positioning to allow icon absolute positioning
    expect(alert.className).toContain('relative');
  });
});
