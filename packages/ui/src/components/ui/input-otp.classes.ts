/**
 * Shared class definitions for InputOTP component
 *
 * Imported by both input-otp.tsx (React) and any framework wrapper to
 * ensure visual parity. Mirrored by input-otp.styles.ts (CSS property
 * maps) for the shadow-DOM-scoped <rafters-input-otp> Web Component.
 */

export const inputOtpContainerClasses = 'flex items-center gap-2';

export const inputOtpGroupClasses = 'flex items-center';

export const inputOtpSlotBaseClasses =
  'relative flex h-9 w-9 items-center justify-center ' +
  'border-y border-r border-input text-body-small shadow-sm ' +
  'transition-all duration-150 motion-reduce:transition-none ' +
  'first:rounded-l-md first:border-l last:rounded-r-md';

export const inputOtpSlotActiveClasses = 'z-10 ring-1 ring-ring';

export const inputOtpSlotFilledClasses = 'text-foreground';

export const inputOtpSlotDisabledClasses = 'cursor-not-allowed opacity-50';

export const inputOtpSeparatorClasses = 'flex items-center justify-center text-muted-foreground';

export const inputOtpCaretContainerClasses =
  'pointer-events-none absolute inset-0 flex items-center justify-center';

export const inputOtpCaretBarClasses = 'h-4 w-px animate-pulse bg-foreground';

export const inputOtpHiddenInputClasses = 'sr-only';
