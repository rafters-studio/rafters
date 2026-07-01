import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../../../src/old/ui/input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input aria-label="Test input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" aria-label="Email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" aria-label="Password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles disabled state', () => {
    render(<Input disabled aria-label="Disabled input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('handles onChange events', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} aria-label="Test" />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('hello');
  });

  it('displays placeholder text', () => {
    render(<Input placeholder="Enter text..." aria-label="Test" />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('initial');

    rerender(<Input value="updated" onChange={() => {}} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');
  });

  it('supports defaultValue for uncontrolled usage', () => {
    render(<Input defaultValue="default" aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('default');
  });

  it('passes through additional HTML attributes', () => {
    render(<Input aria-label="Test" name="test-input" id="test-id" maxLength={10} required />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'test-input');
    expect(input).toHaveAttribute('id', 'test-id');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toBeRequired();
  });
});
