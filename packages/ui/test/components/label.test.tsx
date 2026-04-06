import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from '../../src/components/ui/label';

describe('Label', () => {
  it('renders children', () => {
    render(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders as label element', () => {
    const { container } = render(<Label>Name</Label>);
    expect(container.firstChild?.nodeName).toBe('LABEL');
  });

  it('applies base typography classes', () => {
    const { container } = render(<Label>Username</Label>);
    const label = container.firstChild;
    expect(label).toHaveClass('text-label-medium');
    expect(label).toHaveClass('leading-none');
  });

  it('applies peer-disabled styles', () => {
    const { container } = render(<Label>Password</Label>);
    const label = container.firstChild;
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    expect(label).toHaveClass('peer-disabled:opacity-70');
  });

  it('merges custom className', () => {
    const { container } = render(<Label className="custom-class">Test</Label>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-label-medium');
  });

  it('passes through HTML attributes', () => {
    render(
      <Label data-testid="label" id="email-label">
        Email
      </Label>,
    );
    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('id', 'email-label');
  });

  it('supports htmlFor attribute', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('forwards ref to label element', () => {
    const ref = { current: null } as React.RefObject<HTMLLabelElement>;
    render(<Label ref={ref}>With Ref</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('associates with form control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" type="text" />
      </>,
    );
    const label = screen.getByText('Test Label');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });
});
