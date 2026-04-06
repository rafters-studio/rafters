import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd } from '../../src/components/ui/kbd';

describe('Kbd', () => {
  it('renders children', () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders as kbd element', () => {
    const { container } = render(<Kbd>Enter</Kbd>);
    expect(container.firstChild?.nodeName).toBe('KBD');
  });

  it('applies base styles', () => {
    const { container } = render(<Kbd>Shift</Kbd>);
    const kbd = container.firstChild;
    expect(kbd).toHaveClass('inline-flex');
    expect(kbd).toHaveClass('items-center');
    expect(kbd).toHaveClass('justify-center');
    expect(kbd).toHaveClass('rounded');
    expect(kbd).toHaveClass('border');
    expect(kbd).toHaveClass('border-border');
    expect(kbd).toHaveClass('bg-muted');
    expect(kbd).toHaveClass('px-1.5');
    expect(kbd).toHaveClass('py-0.5');
    expect(kbd).toHaveClass('text-code-small');
    expect(kbd).toHaveClass('text-muted-foreground');
    expect(kbd).toHaveClass('shadow-sm');
  });

  it('merges custom className', () => {
    const { container } = render(<Kbd className="custom-class">K</Kbd>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through HTML attributes', () => {
    render(
      <Kbd data-testid="kbd" aria-label="keyboard shortcut">
        K
      </Kbd>,
    );
    expect(screen.getByTestId('kbd')).toHaveAttribute('aria-label', 'keyboard shortcut');
  });

  it('renders single characters', () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders short words', () => {
    render(<Kbd>Shift</Kbd>);
    expect(screen.getByText('Shift')).toBeInTheDocument();
  });

  it('renders symbols', () => {
    render(<Kbd data-testid="cmd">⌘</Kbd>);
    expect(screen.getByTestId('cmd')).toHaveTextContent('⌘');
  });

  it('renders multiple kbd elements together', () => {
    render(
      <div>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </div>,
    );
    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });
});
