import type { TextareaConfig, TextareaState } from '@/components/ui/textarea.behavior';

export interface TextareaClassSet {
  textarea: string;
  error: string;
}

// bg-transparent, never a page-fill: the control inherits the surface it sits
// on. min-h-20 (not input's fixed h-10) gives the multi-line control room to
// start; the native <textarea> grows from there. Validity is styled off the
// projected aria-invalid, so light-DOM markup, the WC, and React all pick up
// the destructive border with no extra class.
const textareaClasses =
  'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 ts-body-small ' +
  'text-foreground placeholder:text-muted-foreground ' +
  'ring-offset-background ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'transition-shadow duration-100 motion-reduce:transition-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'read-only:cursor-default ' +
  'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive-ring';

const errorClasses = 'ts-body-small text-destructive';

export function textareaClassSet(_config: TextareaConfig, _state: TextareaState): TextareaClassSet {
  return {
    textarea: textareaClasses,
    error: errorClasses,
  };
}
