/**
 * Multi-line text input component for longer form content
 *
 * @cognitive-load 4/10 - Extended input requires sustained attention for composition
 * @attention-economics Expands to accommodate content, focus state indicates active editing
 * @trust-building Auto-resize feedback, character count guidance, draft persistence patterns
 * @accessibility Screen reader labels, keyboard navigation, proper focus states
 * @semantic-meaning Extended text input: comments, descriptions, messages, notes
 *
 * @usage-patterns
 * DO: Always pair with descriptive Label component
 * DO: Provide placeholder text showing expected content format
 * DO: Use appropriate min/max heights for expected content length
 * DO: Consider character limits with visible counter
 * NEVER: Use for single-line input, use without associated label
 *
 * @example
 * ```tsx
 * <Label htmlFor="message">Message</Label>
 * <Textarea id="message" placeholder="Type your message here..." />
 * ```
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import {
  effectiveValue,
  textareaBehavior,
  type TextareaConfig,
  type TextareaPart,
} from './textarea.behavior';
import { textareaClassSet } from './textarea.classes';

export interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue'
> {
  /** Controlled value: shadows the intrinsic state when present. */
  value?: string;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string;
  /** Semantic change callback: fires on a real value change with the value the
   *  consumer should set next (the intrinsic-after value, not the effective
   *  one -- so a controlled field still reports every edit). */
  onValueChange?: (value: string) => void;
  /** Advertised to AT via aria-invalid; wires aria-describedby to errorId. */
  invalid?: boolean;
  /** Id of the external error message element (Field/FormMessage) to reference
   *  from aria-describedby while invalid. */
  errorId?: string;
}

/**
 * Textarea -- the React performance of the textarea score. The shadcn Textarea
 * surface: a lone <textarea> that spreads the consumer's props, composes their
 * onChange, and adds the score's controlled value + validity projection. The
 * multi-line sibling of Input; same thin-by-construction shape.
 *
 * Thin by construction: the score is projection-only, so the controller just
 * wires memory + classes -- no host and no getPart registry. The error id comes
 * from a PROP, not a mounted child, so there is no presence tracking either --
 * ids.error resolves deterministically from errorId, which is why this
 * controller needs no state beyond the memory.
 *
 * @cognitive-load 4/10 - Extended input requires sustained attention for composition
 * @attention-economics Expands to accommodate content, focus state indicates active editing
 * @trust-building Auto-resize feedback, character count guidance, draft persistence patterns
 * @accessibility Screen reader labels, keyboard navigation, proper focus states
 */
export function Textarea({
  value,
  defaultValue,
  onValueChange,
  onChange,
  invalid,
  required,
  disabled,
  readOnly,
  errorId,
  className,
  ...props
}: TextareaProps) {
  const config: TextareaConfig = {
    value,
    defaultValue,
    disabled,
    readonly: readOnly,
    required,
    invalid,
  };

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(textareaBehavior, config), []);
  const state = useMemory(memory);
  const effective = effectiveValue(state, config);

  // error is the only cross-ref part; its id is the consumer's errorId (empty
  // when absent, so the projection drops a dangling aria-describedby).
  const ids = React.useMemo(() => {
    const out = {} as PartIds<TextareaPart>;
    for (const part of Object.keys(textareaBehavior.parts) as TextareaPart[]) {
      out[part] = part === 'error' ? (errorId ?? '') : '';
    }
    return out;
  }, [errorId]);

  // The change callback reads the CURRENT config, so a controlled consumer's
  // callback reports the intended value even though the effective value never
  // moves. Riding in a ref keeps it off the dispatch closure.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    (next: string): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      // Effective-before vs INTRINSIC-after: a controlled field's effective
      // value is pinned by config.value, but the intrinsic reducer still moves,
      // so the callback fires with the value the consumer should adopt.
      const before = effectiveValue(memory.get(), cfg);
      if (!dispatch('setValue', cfg, next)) return false;
      const after = memory.get().value;
      if (after !== before) cb?.(after);
      return true;
    },
    [memory, dispatch],
  );

  const aria = textareaBehavior.aria(state, config, ids);
  const classes = textareaClassSet(config, state);

  return (
    <textarea
      data-part="textarea"
      className={classy(classes.textarea, className)}
      value={effective}
      disabled={disabled}
      readOnly={readOnly}
      {...aria.textarea}
      onChange={(event) => {
        onChange?.(event);
        if (event.defaultPrevented) return;
        request(event.target.value);
      }}
      {...props}
    />
  );
}
