import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../../src/old/ui/input-group';

describe('InputGroup', () => {
  it('renders with default props', () => {
    render(
      <InputGroup data-testid="input-group">
        <InputGroupInput aria-label="Test input" />
      </InputGroup>,
    );
    const group = screen.getByTestId('input-group');
    expect(group).toBeInTheDocument();
    expect(group.tagName).toBe('DIV');
  });

  it('applies base styles', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    const group = container.firstChild;
    expect(group).toHaveClass('flex');
    expect(group).toHaveClass('items-center');
    expect(group).toHaveClass('w-full');
    expect(group).toHaveClass('rounded-md');
    expect(group).toHaveClass('border');
    expect(group).toHaveClass('border-input');
    expect(group).toHaveClass('bg-background');
  });

  it('applies focus-within ring styles', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    const group = container.firstChild;
    expect(group).toHaveClass('focus-within:ring-2');
    expect(group).toHaveClass('focus-within:ring-ring');
    expect(group).toHaveClass('focus-within:ring-offset-2');
  });

  it('applies default size styles', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(container.firstChild).toHaveClass('h-10');
  });

  it('applies sm size styles', () => {
    const { container } = render(
      <InputGroup size="sm">
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(container.firstChild).toHaveClass('h-9');
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('applies lg size styles', () => {
    const { container } = render(
      <InputGroup size="lg">
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(container.firstChild).toHaveClass('h-11');
  });

  it('applies disabled state', () => {
    render(
      <InputGroup disabled data-testid="input-group">
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    const group = screen.getByTestId('input-group');
    expect(group).toHaveClass('opacity-50');
    expect(group).toHaveClass('cursor-not-allowed');
    expect(group).toHaveAttribute('data-disabled', 'true');
  });

  it('merges custom className', () => {
    const { container } = render(
      <InputGroup className="custom-class">
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <InputGroup ref={ref}>
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <InputGroup data-testid="group" aria-label="Input group" id="my-group">
        <InputGroupInput aria-label="Test" />
      </InputGroup>,
    );
    const group = screen.getByTestId('group');
    expect(group).toHaveAttribute('aria-label', 'Input group');
    expect(group).toHaveAttribute('id', 'my-group');
  });
});

describe('InputGroupAddon', () => {
  it('renders with start position', () => {
    const { container } = render(
      <InputGroupAddon position="start" data-testid="addon">
        $
      </InputGroupAddon>,
    );
    const addon = container.firstChild;
    expect(addon).toHaveClass('border-r');
    expect(addon).toHaveClass('border-input');
    expect(addon).toHaveAttribute('data-position', 'start');
  });

  it('renders with end position', () => {
    const { container } = render(
      <InputGroupAddon position="end" data-testid="addon">
        USD
      </InputGroupAddon>,
    );
    const addon = container.firstChild;
    expect(addon).toHaveClass('border-l');
    expect(addon).toHaveClass('border-input');
    expect(addon).toHaveAttribute('data-position', 'end');
  });

  it('applies base styles', () => {
    const { container } = render(<InputGroupAddon position="start">$</InputGroupAddon>);
    const addon = container.firstChild;
    expect(addon).toHaveClass('flex');
    expect(addon).toHaveClass('items-center');
    expect(addon).toHaveClass('justify-center');
    expect(addon).toHaveClass('shrink-0');
    expect(addon).toHaveClass('text-muted-foreground');
  });

  it('applies default variant styles', () => {
    const { container } = render(<InputGroupAddon position="start">$</InputGroupAddon>);
    expect(container.firstChild).toHaveClass('bg-transparent');
    expect(container.firstChild).toHaveClass('px-3');
  });

  it('applies filled variant styles', () => {
    const { container } = render(
      <InputGroupAddon position="start" variant="filled">
        $
      </InputGroupAddon>,
    );
    expect(container.firstChild).toHaveClass('bg-muted');
    expect(container.firstChild).toHaveClass('px-3');
  });

  it('merges custom className', () => {
    const { container } = render(
      <InputGroupAddon position="start" className="custom-addon">
        $
      </InputGroupAddon>,
    );
    expect(container.firstChild).toHaveClass('custom-addon');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <InputGroupAddon position="start" ref={ref}>
        $
      </InputGroupAddon>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <InputGroupAddon position="start" data-testid="addon" aria-label="Currency">
        $
      </InputGroupAddon>,
    );
    const addon = screen.getByTestId('addon');
    expect(addon).toHaveAttribute('aria-label', 'Currency');
  });
});

describe('InputGroupInput', () => {
  it('renders with default props', () => {
    render(<InputGroupInput aria-label="Test input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('applies base styles', () => {
    render(<InputGroupInput aria-label="Test" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('flex-1');
    expect(input).toHaveClass('h-full');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('bg-transparent');
    expect(input).toHaveClass('px-3');
    expect(input).toHaveClass('py-2');
    expect(input).toHaveClass('text-sm');
  });

  it('renders with different input types', () => {
    const { rerender } = render(<InputGroupInput type="email" aria-label="Email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<InputGroupInput type="password" aria-label="Password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('handles disabled state', () => {
    render(<InputGroupInput disabled aria-label="Disabled input" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveClass('disabled:opacity-50');
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('handles onChange events', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<InputGroupInput onChange={handleChange} aria-label="Test" />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('hello');
  });

  it('displays placeholder text', () => {
    render(<InputGroupInput placeholder="Enter text..." aria-label="Test" />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    const { rerender } = render(
      <InputGroupInput value="initial" onChange={() => {}} aria-label="Test" />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('initial');

    rerender(<InputGroupInput value="updated" onChange={() => {}} aria-label="Test" />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');
  });

  it('merges custom className', () => {
    render(<InputGroupInput className="custom-input" aria-label="Test" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('flex-1');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<InputGroupInput ref={ref} aria-label="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <InputGroupInput aria-label="Test" name="test-input" id="test-id" maxLength={10} required />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'test-input');
    expect(input).toHaveAttribute('id', 'test-id');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toBeRequired();
  });
});

describe('InputGroup composition', () => {
  it('renders complete group with start addon', () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupAddon position="start" data-testid="addon">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Amount" data-testid="input" />
      </InputGroup>,
    );

    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('addon')).toHaveTextContent('$');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders complete group with end addon', () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupInput aria-label="Amount" />
        <InputGroupAddon position="end" data-testid="addon">
          USD
        </InputGroupAddon>
      </InputGroup>,
    );

    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('addon')).toHaveTextContent('USD');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders complete group with both addons', () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupAddon position="start" data-testid="start-addon">
          $
        </InputGroupAddon>
        <InputGroupInput aria-label="Price" placeholder="0.00" />
        <InputGroupAddon position="end" data-testid="end-addon">
          USD
        </InputGroupAddon>
      </InputGroup>,
    );

    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('start-addon')).toHaveTextContent('$');
    expect(screen.getByTestId('end-addon')).toHaveTextContent('USD');
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('renders with icon in addon', () => {
    const SearchIcon = () => <svg data-testid="search-icon" aria-hidden="true" />;

    render(
      <InputGroup>
        <InputGroupAddon position="start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search" placeholder="Search..." />
      </InputGroup>,
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with button in addon', () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="Code" placeholder="Enter code" />
        <InputGroupAddon position="end">
          <button type="button">Apply</button>
        </InputGroupAddon>
      </InputGroup>,
    );

    expect(screen.getByPlaceholderText('Enter code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('handles focus across the group', async () => {
    const user = userEvent.setup();
    render(
      <InputGroup data-testid="group">
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
      </InputGroup>,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(input).toHaveFocus();
  });

  it('preserves input functionality within group', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <InputGroup>
        <InputGroupAddon position="start">$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" onChange={handleChange} />
        <InputGroupAddon position="end">USD</InputGroupAddon>
      </InputGroup>,
    );

    const input = screen.getByRole('textbox');
    await user.type(input, '100');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('100');
  });
});
