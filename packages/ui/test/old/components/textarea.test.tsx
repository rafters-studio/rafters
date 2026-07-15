import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from '../../../src/old/ui/textarea';

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea aria-label="Test textarea" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-class" aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} aria-label="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('handles disabled state', () => {
    render(<Textarea disabled aria-label="Disabled textarea" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('aria-disabled', 'true');
    expect(textarea).toHaveClass('disabled:opacity-50');
  });

  it('handles onChange events', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} aria-label="Test" />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'hello');

    expect(handleChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('hello');
  });

  it('displays placeholder text', () => {
    render(<Textarea placeholder="Enter text..." aria-label="Test" />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    const { rerender } = render(<Textarea value="initial" onChange={() => {}} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('initial');

    rerender(<Textarea value="updated" onChange={() => {}} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');
  });

  it('supports defaultValue for uncontrolled usage', () => {
    render(<Textarea defaultValue="default" aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('default');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Textarea aria-label="Test" name="test-textarea" id="test-id" maxLength={500} required />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('name', 'test-textarea');
    expect(textarea).toHaveAttribute('id', 'test-id');
    expect(textarea).toHaveAttribute('maxLength', '500');
    expect(textarea).toBeRequired();
  });

  it('supports rows attribute', () => {
    render(<Textarea rows={10} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '10');
  });

  it('supports cols attribute', () => {
    render(<Textarea cols={50} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('cols', '50');
  });

  it('has minimum height styling', () => {
    render(<Textarea aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveClass('min-h-20');
  });
});
