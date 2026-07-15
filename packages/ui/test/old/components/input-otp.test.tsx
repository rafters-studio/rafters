import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '../../../src/old/ui/input-otp';

const TestInputOTP = ({
  value,
  onChange,
  onComplete,
  maxLength = 6,
  disabled = false,
}: {
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
}) => (
  <InputOTP
    value={value}
    onChange={onChange}
    onComplete={onComplete}
    maxLength={maxLength}
    disabled={disabled}
    data-testid="otp-container"
  >
    <InputOTPGroup data-testid="group-1">
      <InputOTPSlot index={0} data-testid="slot-0" />
      <InputOTPSlot index={1} data-testid="slot-1" />
      <InputOTPSlot index={2} data-testid="slot-2" />
    </InputOTPGroup>
    <InputOTPSeparator data-testid="separator" />
    <InputOTPGroup data-testid="group-2">
      <InputOTPSlot index={3} data-testid="slot-3" />
      <InputOTPSlot index={4} data-testid="slot-4" />
      <InputOTPSlot index={5} data-testid="slot-5" />
    </InputOTPGroup>
  </InputOTP>
);

describe('InputOTP - Basic Rendering', () => {
  it('should render container with groups and slots', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('otp-container')).toBeInTheDocument();
    expect(screen.getByTestId('group-1')).toBeInTheDocument();
    expect(screen.getByTestId('group-2')).toBeInTheDocument();
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('should render all slots', () => {
    render(<TestInputOTP />);

    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`slot-${i}`)).toBeInTheDocument();
    }
  });

  it('should render with namespaced components', () => {
    render(
      <InputOTP maxLength={4} data-testid="otp">
        <InputOTP.Group data-testid="group">
          <InputOTP.Slot index={0} data-testid="slot" />
          <InputOTP.Slot index={1} />
          <InputOTP.Separator data-testid="sep" />
          <InputOTP.Slot index={2} />
          <InputOTP.Slot index={3} />
        </InputOTP.Group>
      </InputOTP>,
    );

    expect(screen.getByTestId('otp')).toBeInTheDocument();
    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toBeInTheDocument();
    expect(screen.getByTestId('sep')).toBeInTheDocument();
  });
});

describe('InputOTP - Hidden Input', () => {
  it('should have a hidden input for the value', () => {
    render(<TestInputOTP />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute('type', 'text');
    expect(hiddenInput).toHaveAttribute('inputmode', 'numeric');
    expect(hiddenInput).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('should have aria-label on hidden input', () => {
    render(<TestInputOTP />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(hiddenInput).toHaveAttribute('aria-label', 'Enter 6 digit code');
  });

  it('should have maxLength on hidden input', () => {
    render(<TestInputOTP maxLength={4} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(hiddenInput).toHaveAttribute('maxLength', '4');
  });
});

describe('InputOTP - Value Display', () => {
  it('should display value in slots', () => {
    render(<TestInputOTP value="123456" />);

    expect(screen.getByTestId('slot-0')).toHaveTextContent('1');
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2');
    expect(screen.getByTestId('slot-2')).toHaveTextContent('3');
    expect(screen.getByTestId('slot-3')).toHaveTextContent('4');
    expect(screen.getByTestId('slot-4')).toHaveTextContent('5');
    expect(screen.getByTestId('slot-5')).toHaveTextContent('6');
  });

  it('should handle partial value', () => {
    render(<TestInputOTP value="12" />);

    expect(screen.getByTestId('slot-0')).toHaveTextContent('1');
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2');
    expect(screen.getByTestId('slot-2')).toHaveTextContent('');
  });
});

describe('InputOTP - Input Handling', () => {
  it('should call onChange when typing', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(hiddenInput, { target: { value: '1' } });

    expect(handleChange).toHaveBeenCalledWith('1');
  });

  it('should filter non-numeric characters by default', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(hiddenInput, { target: { value: '1a2b3' } });

    expect(handleChange).toHaveBeenCalledWith('123');
  });

  it('should truncate to maxLength', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP maxLength={4} onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(hiddenInput, { target: { value: '123456' } });

    expect(handleChange).toHaveBeenCalledWith('1234');
  });

  it('should call onComplete when all slots filled', () => {
    const handleComplete = vi.fn();
    render(<TestInputOTP onComplete={handleComplete} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(hiddenInput, { target: { value: '123456' } });

    expect(handleComplete).toHaveBeenCalledWith('123456');
  });

  it('should not call onComplete when partially filled', () => {
    const handleComplete = vi.fn();
    render(<TestInputOTP onComplete={handleComplete} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(hiddenInput, { target: { value: '12345' } });

    expect(handleComplete).not.toHaveBeenCalled();
  });
});

describe('InputOTP - Keyboard Navigation', () => {
  it('should handle backspace to delete last character', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP value="123" onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(hiddenInput, { key: 'Backspace' });

    expect(handleChange).toHaveBeenCalledWith('12');
  });

  it('should not call onChange on backspace when empty', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP value="" onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.keyDown(hiddenInput, { key: 'Backspace' });

    // onChange should not be called with empty string again
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe('InputOTP - Paste Handling', () => {
  it('should handle paste', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.paste(hiddenInput, {
      clipboardData: { getData: () => '123456' },
    });

    expect(handleChange).toHaveBeenCalledWith('123456');
  });

  it('should filter pasted content', () => {
    const handleChange = vi.fn();
    render(<TestInputOTP onChange={handleChange} />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    fireEvent.paste(hiddenInput, {
      clipboardData: { getData: () => '12-34-56' },
    });

    expect(handleChange).toHaveBeenCalledWith('123456');
  });
});

describe('InputOTP - Click Handling', () => {
  it('should focus input when container clicked', () => {
    render(<TestInputOTP />);

    const container = screen.getByTestId('otp-container');
    fireEvent.click(container);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(document.activeElement).toBe(hiddenInput);
  });

  it('should focus input when slot clicked', () => {
    render(<TestInputOTP />);

    fireEvent.click(screen.getByTestId('slot-2'));

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(document.activeElement).toBe(hiddenInput);
  });
});

describe('InputOTP - Disabled State', () => {
  it('should apply opacity when disabled', () => {
    render(<TestInputOTP disabled />);

    expect(screen.getByTestId('otp-container').className).toContain('opacity-50');
  });

  it('should disable hidden input when disabled', () => {
    render(<TestInputOTP disabled />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(hiddenInput).toBeDisabled();
  });

  it('should not focus when clicking disabled', () => {
    render(<TestInputOTP disabled />);

    const container = screen.getByTestId('otp-container');
    const hiddenInput = screen.getByRole('textbox', { hidden: true });

    fireEvent.click(container);

    // The input won't be focused because click handler checks disabled
    expect(document.activeElement).not.toBe(hiddenInput);
  });
});

describe('InputOTP - Slot States', () => {
  it('should mark filled slots with data-filled', () => {
    render(<TestInputOTP value="12" />);

    expect(screen.getByTestId('slot-0')).toHaveAttribute('data-filled', 'true');
    expect(screen.getByTestId('slot-1')).toHaveAttribute('data-filled', 'true');
    expect(screen.getByTestId('slot-2')).not.toHaveAttribute('data-filled');
  });
});

describe('InputOTP - Separator', () => {
  it('should be hidden from assistive technology (decorative)', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('separator')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render dot icon in separator', () => {
    render(<TestInputOTP />);

    const separator = screen.getByTestId('separator');
    expect(separator.querySelector('svg')).toBeInTheDocument();
  });
});

describe('InputOTP - Data Attributes', () => {
  it('should set data-input-otp-container on root', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('otp-container')).toHaveAttribute('data-input-otp-container');
  });

  it('should set data-input-otp-group on groups', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('group-1')).toHaveAttribute('data-input-otp-group');
  });

  it('should set data-input-otp-slot on slots', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('slot-0')).toHaveAttribute('data-input-otp-slot');
  });

  it('should set data-input-otp-separator on separator', () => {
    render(<TestInputOTP />);

    expect(screen.getByTestId('separator')).toHaveAttribute('data-input-otp-separator');
  });

  it('should set data-input-otp on hidden input', () => {
    render(<TestInputOTP />);

    const hiddenInput = screen.getByRole('textbox', { hidden: true });
    expect(hiddenInput).toHaveAttribute('data-input-otp');
  });
});

describe('InputOTP - Custom className', () => {
  it('should merge custom className on container', () => {
    render(
      <InputOTP maxLength={4} className="custom-container" data-testid="otp">
        <InputOTP.Group>
          <InputOTP.Slot index={0} />
        </InputOTP.Group>
      </InputOTP>,
    );

    expect(screen.getByTestId('otp').className).toContain('custom-container');
  });

  it('should merge custom className on group', () => {
    render(
      <InputOTP maxLength={4}>
        <InputOTP.Group className="custom-group" data-testid="group">
          <InputOTP.Slot index={0} />
        </InputOTP.Group>
      </InputOTP>,
    );

    expect(screen.getByTestId('group').className).toContain('custom-group');
  });

  it('should merge custom className on slot', () => {
    render(
      <InputOTP maxLength={4}>
        <InputOTP.Group>
          <InputOTP.Slot index={0} className="custom-slot" data-testid="slot" />
        </InputOTP.Group>
      </InputOTP>,
    );

    expect(screen.getByTestId('slot').className).toContain('custom-slot');
  });

  it('should merge custom className on separator', () => {
    render(
      <InputOTP maxLength={4}>
        <InputOTP.Separator className="custom-separator" data-testid="sep" />
      </InputOTP>,
    );

    expect(screen.getByTestId('sep').className).toContain('custom-separator');
  });
});

describe('InputOTP - Uncontrolled', () => {
  it('should work in uncontrolled mode', () => {
    render(
      <InputOTP maxLength={4} defaultValue="12" data-testid="otp">
        <InputOTP.Group>
          <InputOTP.Slot index={0} data-testid="slot-0" />
          <InputOTP.Slot index={1} data-testid="slot-1" />
          <InputOTP.Slot index={2} data-testid="slot-2" />
          <InputOTP.Slot index={3} data-testid="slot-3" />
        </InputOTP.Group>
      </InputOTP>,
    );

    expect(screen.getByTestId('slot-0')).toHaveTextContent('1');
    expect(screen.getByTestId('slot-1')).toHaveTextContent('2');
  });
});
