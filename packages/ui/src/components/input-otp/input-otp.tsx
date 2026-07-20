import * as React from 'react';
import { createBehavior } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import {
  composeInputOtpInteractions,
  effectiveOtpValue,
  filterAndTruncate,
  inputOtpBehavior,
  otpSlotAttrs,
  slotState,
  type InputOtpConfig,
  type InputOtpState,
} from './input-otp.behavior';
import { inputOtpClassSet } from './input-otp.classes';

/**
 * InputOTP -- the React performance of the input-otp score. The oracle's
 * compound surface is preserved exactly: `<InputOTP maxLength>` with
 * `InputOTP.Group` / `InputOTP.Slot index` / `InputOTP.Separator` children, so
 * a consumer chooses their own grouping (3-3, 2-2-2) and the separators that go
 * between. `value` / `defaultValue` / `onChange` / `pattern` / `disabled` /
 * `autoFocus` / `onComplete` all keep their oracle meanings.
 *
 * Thin by construction: the score owns the filter, the active-slot rule and the
 * projections, and the ONE keyboard/paste/focus surface
 * (`composeInputOtpInteractions`) is the same composition the WC/Astro bind
 * runs. The real input stays DOM-uncontrolled and is synced to the effective
 * value in an effect -- the same value-sync the bind performs -- because a React
 * controlled input would fight the native caret the score deliberately does not
 * own.
 *
 * @cognitive-load 4/10 - decision 1, information 2, interaction 1, disruption 3,
 * learning 1. There is only one thing to enter and it is dictated by another
 * device, so no decision is being made; the load is transcription under a time
 * limit. The slot count tells the user exactly how much is left, but the task
 * interrupts whatever they were doing, which is where the disruption sits.
 * @attention-economics The segmented slots make remaining work countable at a
 * glance and the caret marks the exact next position, so attention never has to
 * re-scan the field. Auto-advance and whole-code paste remove the per-character
 * decisions that would otherwise multiply a six-character task by six.
 * @trust-building Rejected characters never appear -- the pattern filters before
 * the value is committed, so the field cannot show a code it will not accept.
 * Paste splits a copied code across every slot, backspace walks back
 * destructively, and completion is reported once on the edge, never repeatedly.
 * @accessibility One real <input> owns the caret, IME, selection and focus, and
 * carries the accessible name ("Enter N character code") plus
 * autocomplete="one-time-code" for platform SMS autofill; the slots are a
 * painted mirror and add no tab stops. Arrow keys move the lit slot without
 * moving focus. Disabled projects aria-disabled and gates every entry path.
 */

export interface InputOTPContextValue {
  state: InputOtpState;
  config: InputOtpConfig;
}

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTPContext(): InputOTPContextValue {
  const context = React.useContext(InputOTPContext);
  if (!context) {
    throw new Error('InputOTP components must be used within InputOTP');
  }
  return context;
}

export interface InputOTPProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Controlled value: shadows the intrinsic state when present. */
  value?: string;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string;
  /** Fires on every accepted edit with the value the consumer should adopt. */
  onChange?: (value: string) => void;
  /** Number of slots; also the hard cap on the value's length. */
  maxLength: number;
  /** Per-character accept test. A RegExp (oracle surface) or its source string. */
  pattern?: RegExp | string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Fires once on the edge where the last slot fills. */
  onComplete?: (value: string) => void;
  required?: boolean;
  /** Form field name: the real input submits natively, no hidden mirror. */
  name?: string;
  'aria-label'?: string;
}

export function InputOTP({
  value,
  defaultValue,
  onChange,
  maxLength,
  pattern,
  disabled = false,
  autoFocus = false,
  onComplete,
  required = false,
  name,
  'aria-label': ariaLabel,
  className,
  children,
  ...rest
}: InputOTPProps): React.JSX.Element {
  const config: InputOtpConfig = {
    maxLength,
    pattern: typeof pattern === 'string' ? pattern : pattern?.source,
    value,
    defaultValue,
    disabled,
    required,
    label: ariaLabel,
  };

  const { memory, dispatch } = React.useMemo(() => createBehavior(inputOtpBehavior, config), []);
  const state = useMemory(memory);
  const effective = effectiveOtpValue(state, config);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // The callbacks read the CURRENT config, so a controlled consumer's callback
  // reports the intended value even though the effective value never moves.
  // Riding in a ref keeps them off the dispatch closure.
  const latest = React.useRef({ config, onChange, onComplete });
  latest.current = { config, onChange, onComplete };

  const requestValue = React.useCallback(
    (raw: string): string => {
      const { config: cfg, onChange: change, onComplete: complete } = latest.current;
      const next = filterAndTruncate(raw, cfg);
      // Gotcha #1: effective-BEFORE vs intrinsic-AFTER. A controlled field's
      // effective value is pinned by config.value, but the intrinsic reducer
      // still moves, so the callback fires with the value to adopt.
      const before = effectiveOtpValue(memory.get(), cfg);
      if (!dispatch('setValue', cfg, next)) return before;
      const after = memory.get().value;
      if (after === before) return effectiveOtpValue(memory.get(), cfg);
      change?.(after);
      // The completion EDGE: crossing into a full code, never re-reported while
      // the code stays full. Measured on the intrinsic before/after pair rather
      // than isComplete, which reads the EFFECTIVE value a controlled field pins
      // -- the edge the consumer needs is the one the value they are handed
      // crosses.
      if (before.length !== cfg.maxLength && after.length === cfg.maxLength) {
        complete?.(after);
      }
      // The value the FIELD should now show: a controlled consumer pins it, so
      // the caller reconciles the DOM against this, not against `after`.
      return effectiveOtpValue(memory.get(), cfg);
    },
    [memory, dispatch],
  );

  const requestActive = React.useCallback(
    (index: number): void => {
      dispatch('setActive', latest.current.config, index);
    },
    [dispatch],
  );

  // Compose the ONE keyboard/paste/focus surface -- the same composition the
  // bind runs. Nothing in it closes over config (it is read live via
  // getConfig), so it is created once per mounted element.
  React.useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    if (!root || !input) return;
    return composeInputOtpInteractions({
      root,
      input,
      getConfig: () => latest.current.config,
      getState: () => memory.get(),
      requestValue,
      requestActive,
    });
  }, [memory, requestValue, requestActive]);

  // Value-sync, the same rule the bind applies: write only on divergence, so
  // the native caret survives typing and a refused character is reverted.
  React.useEffect(() => {
    const input = inputRef.current;
    if (input && input.value !== effective) input.value = effective;
  }, [effective]);

  const aria = inputOtpBehavior.aria(state, config, {
    root: '',
    input: '',
    group: '',
    slot: '',
    separator: '',
  });
  const classes = inputOtpClassSet(config, state);

  // Deliberately unmemoized. `config` is rebuilt from props every render, so a
  // memo could only key on its individual fields -- which is both a lie to the
  // linter and a cache that misses whenever any of them moves. The slots are
  // pure projections of (state, config) and must re-paint on exactly those, so
  // a fresh context value per render is the correct behavior, not a leak.
  const contextValue: InputOTPContextValue = { state, config };

  return (
    <InputOTPContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        data-max-length={maxLength}
        className={classy(classes.root, className)}
        {...aria.root}
        {...rest}
      >
        <input
          ref={inputRef}
          data-part="input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          name={name}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          defaultValue={effective}
          // biome-ignore lint/a11y/noAutofocus: the oracle's autoFocus surface; an
          // OTP field is the sole purpose of the screen it appears on.
          autoFocus={autoFocus}
          className={classes.input}
          {...aria.input}
        />
        {children}
      </div>
    </InputOTPContext.Provider>
  );
}

export interface InputOTPGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function InputOTPGroup({
  className,
  children,
  ...props
}: InputOTPGroupProps): React.JSX.Element {
  const { state, config } = useInputOTPContext();
  const classes = inputOtpClassSet(config, state);
  return (
    <div data-part="group" className={classy(classes.group, className)} {...props}>
      {children}
    </div>
  );
}

export interface InputOTPSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
}

export function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps): React.JSX.Element {
  const { state, config } = useInputOTPContext();
  const classes = inputOtpClassSet(config, state);
  const slot = slotState(index, state, config);

  // The character and the caret are built with createElement so the class
  // strings stay plain composition -- the same escape slider uses for its
  // track/thumb spans; these carry no typography role.
  const char = React.createElement(
    'span',
    { 'data-otp-char': '', className: classes.char },
    slot.char,
  );
  const caret = React.createElement(
    'span',
    {
      'data-otp-caret': '',
      'aria-hidden': 'true',
      hidden: !slot.caret,
      className: classes.caret,
    },
    React.createElement('span', { className: classes.caretBar }),
  );

  return (
    <div
      data-part="slot"
      data-value={index}
      className={classy(classes.slot, className)}
      {...otpSlotAttrs(String(index), state, config)}
      {...props}
    >
      {char}
      {caret}
    </div>
  );
}

export interface InputOTPSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function InputOTPSeparator({
  className,
  children,
  ...props
}: InputOTPSeparatorProps): React.JSX.Element {
  const { state, config } = useInputOTPContext();
  const classes = inputOtpClassSet(config, state);
  // Decorative: the separator carries no meaning the value does not already
  // carry, so it is hidden from AT rather than read out as punctuation.
  return (
    <div
      data-part="separator"
      aria-hidden="true"
      className={classy(classes.separator, className)}
      {...props}
    >
      {children ?? '-'}
    </div>
  );
}

InputOTP.displayName = 'InputOTP';
InputOTPGroup.displayName = 'InputOTPGroup';
InputOTPSlot.displayName = 'InputOTPSlot';
InputOTPSeparator.displayName = 'InputOTPSeparator';

InputOTP.Group = InputOTPGroup;
InputOTP.Slot = InputOTPSlot;
InputOTP.Separator = InputOTPSeparator;

export default InputOTP;
