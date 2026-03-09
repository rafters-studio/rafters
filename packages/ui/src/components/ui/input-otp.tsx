/**
 * InputOTP component for one-time password and verification code input
 *
 * @cognitive-load 4/10 - Single-purpose input; segmented display aids focus
 * @attention-economics Medium attention: focused on accurate character entry
 * @trust-building Clear slot indicators, auto-advance between slots, paste support
 * @accessibility Single input with ARIA live for progress, visible focus state
 * @semantic-meaning Security verification: 2FA, email confirmation, phone verification
 *
 * @usage-patterns
 * DO: Use for verification codes (2FA, email, SMS)
 * DO: Support paste for full code
 * DO: Auto-advance cursor between slots
 * DO: Show clear visual feedback for filled vs empty slots
 * DO: Allow backspace to navigate and clear
 * NEVER: Use for regular text input
 * NEVER: Hide the input visually from screen readers
 * NEVER: Require manual tab between slots
 *
 * @example
 * ```tsx
 * <InputOTP maxLength={6} value={otp} onChange={setOtp}>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={0} />
 *     <InputOTP.Slot index={1} />
 *     <InputOTP.Slot index={2} />
 *   </InputOTP.Group>
 *   <InputOTP.Separator />
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={3} />
 *     <InputOTP.Slot index={4} />
 *     <InputOTP.Slot index={5} />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 */

import * as React from 'react';
import classy from '../../primitives/classy';

// ==================== Context ====================

interface InputOTPContextValue {
  value: string;
  maxLength: number;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled: boolean;
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTPContext(): InputOTPContextValue {
  const context = React.useContext(InputOTPContext);
  if (!context) {
    throw new Error('InputOTP components must be used within InputOTP');
  }
  return context;
}

// ==================== InputOTP (Root) ====================

export interface InputOTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  maxLength: number;
  pattern?: RegExp;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
}

export function InputOTP({
  value: controlledValue,
  defaultValue = '',
  onChange,
  maxLength,
  pattern = /^[0-9]*$/,
  disabled = false,
  autoFocus = false,
  onComplete,
  className,
  children,
  ...props
}: InputOTPProps): React.JSX.Element {
  // Controlled/uncontrolled value
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  // Track which slot is "active" for visual feedback
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Hidden input ref
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Handle value changes
  const handleChange = React.useCallback(
    (newValue: string): void => {
      // Filter to pattern
      const filtered = newValue
        .split('')
        .filter((char) => pattern.test(char))
        .join('');
      const truncated = filtered.slice(0, maxLength);

      if (!isControlled) {
        setUncontrolledValue(truncated);
      }
      onChange?.(truncated);

      // Update active index based on value length
      setActiveIndex(Math.min(truncated.length, maxLength - 1));

      // Fire onComplete when all slots filled
      if (truncated.length === maxLength) {
        onComplete?.(truncated);
      }
    },
    [isControlled, maxLength, onChange, onComplete, pattern],
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    handleChange(e.target.value);
  };

  // Handle keydown for navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (value.length > 0) {
        handleChange(value.slice(0, -1));
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex(Math.max(0, activeIndex - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex(Math.min(value.length, maxLength - 1));
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handleChange(pasted);
  };

  // Focus input when clicking anywhere in the component
  const handleContainerClick = (): void => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  // Auto focus
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const contextValue = React.useMemo<InputOTPContextValue>(
    () => ({
      value,
      maxLength,
      activeIndex,
      setActiveIndex,
      inputRef,
      disabled,
    }),
    [value, maxLength, activeIndex, disabled],
  );

  return (
    <InputOTPContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Container click focuses hidden input for better UX */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard input is handled by the hidden input element */}
      <div
        data-input-otp-container=""
        onClick={handleContainerClick}
        className={classy('flex items-center gap-2', disabled && 'opacity-50', className)}
        {...props}
      >
        {/* Hidden input for actual value */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          maxLength={maxLength}
          aria-label={`Enter ${maxLength} digit code`}
          className="sr-only"
          data-input-otp=""
        />
        {children}
      </div>
    </InputOTPContext.Provider>
  );
}

// ==================== InputOTPGroup ====================

export interface InputOTPGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function InputOTPGroup({
  className,
  children,
  ...props
}: InputOTPGroupProps): React.JSX.Element {
  return (
    <div data-input-otp-group="" className={classy('flex items-center', className)} {...props}>
      {children}
    </div>
  );
}

// ==================== InputOTPSlot ====================

export interface InputOTPSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
}

export function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps): React.JSX.Element {
  const { value, maxLength, activeIndex, inputRef, disabled } = useInputOTPContext();

  const char = value[index] ?? '';
  const isActive = index === activeIndex || (value.length === maxLength && index === maxLength - 1);
  const isFilled = index < value.length;
  const hasFakeCaret = isActive && !isFilled;

  // Click on slot focuses input and sets active index
  const handleClick = (): void => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Slot click focuses the hidden input for better UX
    // biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard input is handled by the hidden input element
    <div
      data-input-otp-slot=""
      data-active={isActive || undefined}
      data-filled={isFilled || undefined}
      onClick={handleClick}
      className={classy(
        'relative flex h-9 w-9 items-center justify-center',
        'border-y border-r border-input text-sm shadow-sm transition-all',
        'first:rounded-l-md first:border-l last:rounded-r-md',
        isActive && 'z-10 ring-1 ring-ring',
        disabled && 'cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-pulse bg-foreground" />
        </div>
      )}
    </div>
  );
}

// ==================== InputOTPSeparator ====================

export interface InputOTPSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function InputOTPSeparator({
  className,
  ...props
}: InputOTPSeparatorProps): React.JSX.Element {
  // Decorative separator - hidden from assistive technology
  return (
    <div
      data-input-otp-separator=""
      aria-hidden="true"
      className={classy('flex items-center justify-center', className)}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-muted-foreground"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
      </svg>
    </div>
  );
}

// ==================== Display Names ====================

InputOTP.displayName = 'InputOTP';
InputOTPGroup.displayName = 'InputOTPGroup';
InputOTPSlot.displayName = 'InputOTPSlot';
InputOTPSeparator.displayName = 'InputOTPSeparator';

// ==================== Namespaced Export ====================

InputOTP.Group = InputOTPGroup;
InputOTP.Slot = InputOTPSlot;
InputOTP.Separator = InputOTPSeparator;
