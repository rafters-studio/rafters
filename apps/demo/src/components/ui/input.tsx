import * as React from 'react';
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  effectiveValue,
  inputBehavior,
  type InputConfig,
  type InputPart,
} from '@/components/ui/input.behavior';
import { inputClassSet } from '@/components/ui/input.classes';

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
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
 * Input -- the React performance of the input score. The shadcn Input surface:
 * a lone <input> that spreads the consumer's props, composes their onChange,
 * and adds the score's controlled value + validity projection.
 *
 * Thin by construction: the score is projection-only, so the controller just
 * wires memory + classes -- no host and no getPart registry. The error id comes
 * from a PROP, not a mounted child, so there is no presence tracking either --
 * ids.error resolves deterministically from errorId, which is why this
 * controller needs no state beyond the memory.
 */
export function Input({
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
}: InputProps) {
  const config: InputConfig = {
    value,
    defaultValue,
    disabled,
    readonly: readOnly,
    required,
    invalid,
  };

  // The controller composes the score with the substrate -- no useBehavior.
  const { memory, dispatch } = React.useMemo(() => createBehavior(inputBehavior, config), []);
  const state = useMemory(memory);
  const effective = effectiveValue(state, config);

  // error is the only cross-ref part; its id is the consumer's errorId (empty
  // when absent, so the projection drops a dangling aria-describedby).
  const ids = React.useMemo(() => {
    const out = {} as PartIds<InputPart>;
    for (const part of Object.keys(inputBehavior.parts) as InputPart[]) {
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

  const aria = inputBehavior.aria(state, config, ids);
  const classes = inputClassSet(config, state);

  return (
    <input
      data-part="input"
      className={classy(classes.input, className)}
      value={effective}
      disabled={disabled}
      readOnly={readOnly}
      {...aria.input}
      onChange={(event) => {
        onChange?.(event);
        if (event.defaultPrevented) return;
        request(event.target.value);
      }}
      {...props}
    />
  );
}
