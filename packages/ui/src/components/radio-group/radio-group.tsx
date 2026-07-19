import * as React from 'react';
import { createBehavior, type PartIds } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  radioGroup,
  radioItemAria,
  selectedValue,
  type RadioGroupConfig,
  type RadioGroupPart,
  type RadioGroupState,
} from './radio-group.behavior';
import { radioGroupClasses, type RadioGroupClassSet } from './radio-group.classes';

const MOVEMENT_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

const ITEM_SELECTOR = '[data-part="item"][data-value]:not([disabled])';

interface RadioGroupContextValue {
  state: RadioGroupState;
  config: RadioGroupConfig;
  classes: RadioGroupClassSet;
  groupDisabled: boolean;
  request: (value: string) => boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext(component: string): RadioGroupContextValue {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error(`${component} must be used within <RadioGroup>`);
  }
  return context;
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled value. */
  value?: string;
  /** Default value for uncontrolled usage. */
  defaultValue?: string;
  /** Callback when the selection changes via user interaction. */
  onValueChange?: (value: string) => void;
  /** Whether the entire group is disabled. */
  disabled?: boolean;
  /** Layout / arrow-navigation orientation. */
  orientation?: 'horizontal' | 'vertical';
  /** Advertised to AT via aria-required. */
  required?: boolean;
  /** Form field name (inert surface; see radio-group.md dispositions). */
  name?: string;
}

/**
 * Exclusive radio set. Selects exactly one option; arrow keys move focus AND
 * select the newly focused item (selection follows focus); Space/Enter select
 * the focused item; Tab enters the group at the checked (or first) option.
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 1, disruption
 * 0, learning 0. One decision (pick one of a visible few); options are visible
 * simultaneously so comparison is direct and no state has to be recalled. A
 * universally learned affordance with no workflow disruption.
 * @attention-economics Options visible simultaneously: the set enables
 * side-by-side comparison and reduces memory load. Best for 2-5 mutually
 * exclusive choices; beyond ~7 a Select reclaims the attention budget.
 * @trust-building Immediate visual feedback on the checked dot, a reversible
 * choice, and a single always-clear current state. Radios never silently
 * deselect, so the user is never left with an ambiguous "nothing chosen" after
 * having chosen.
 * @accessibility role="radiogroup" with aria-orientation on the container and
 * role="radio" + aria-checked per item, wired to real DOM by the harness.
 * Roving tabindex keeps exactly one item in the tab order; arrow keys move and
 * select; Space/Enter select. Disabled items leave the tab order and are
 * skipped by roving.
 */
export function RadioGroup({
  value,
  defaultValue = '',
  onValueChange,
  disabled = false,
  orientation = 'vertical',
  required = false,
  name,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const config: RadioGroupConfig = { value, defaultValue, orientation, disabled, required, name };

  // The controller composes the score with the substrate -- no useBehavior.
  // createBehavior is the model; useMemory subscribes React to it; a useEffect
  // below composes the roving-focus primitive directly against the root.
  const { memory, dispatch } = React.useMemo(() => createBehavior(radioGroup, config), []);
  const state = useMemory(memory);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<RadioGroupPart>;
    for (const part of Object.keys(radioGroup.parts) as RadioGroupPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Gotcha #1: the controlled callback compares the EFFECTIVE value before
  // against the INTRINSIC value after the reducer -- a controlled group's
  // effective value never moves (config shadows it), but the callback must
  // still report the value to set. canDispatch already gates group-disabled.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    (nextValue: string): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      const before = selectedValue(memory.get(), cfg) ?? '';
      if (!dispatch('select', cfg, nextValue)) return false;
      const after = memory.get().value ?? '';
      if (after !== before) cb?.(after);
      return true;
    },
    [memory, dispatch],
  );

  // Compose the roving-focus primitive directly against the root -- it owns the
  // roving tabindex and arrow/Home/End movement across the [role="radio"] items.
  // Declared ABOVE the selection effect so its native keydown listener registers
  // first and moves focus before the selection handler reads activeElement.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return createRovingFocus(root, { orientation });
  }, [orientation]);

  // Selection is wired as a NATIVE keydown listener, registered in an effect
  // that runs AFTER the roving-focus effect above -- so it fires after roving's
  // own native listener has already moved focus. This is the same registration
  // order the DOM-native bind relies on; a React synthetic onKeyDown would fire
  // before roving and read stale focus. Space/Enter select the focused item;
  // arrows/Home/End select whatever item roving just focused.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === ' ' || key === 'Enter') {
        const item = (event.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR);
        const itemValue = item?.dataset['value'];
        if (itemValue === undefined || !root.contains(item)) return;
        event.preventDefault();
        request(itemValue);
        return;
      }
      if (!MOVEMENT_KEYS.has(key)) return;
      const active = document.activeElement as HTMLElement | null;
      const item = active?.closest<HTMLElement>(ITEM_SELECTOR) ?? null;
      const itemValue = item?.dataset['value'];
      if (!item || itemValue === undefined || !root.contains(item)) return;
      request(itemValue);
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [request]);

  const aria = radioGroup.aria(state, config, ids);
  const classes = radioGroupClasses(config, state);

  const contextValue: RadioGroupContextValue = {
    state,
    config,
    classes,
    groupDisabled: disabled,
    request,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        id={ids.root}
        role="radiogroup"
        data-name={name}
        className={classy(classes.root, className)}
        {...aria.root}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

RadioGroup.displayName = 'RadioGroup';

export interface RadioGroupItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  /** Value that identifies this radio item. */
  value: string;
}

export function RadioGroupItem({
  value,
  className,
  children,
  disabled: itemDisabled,
  onClick,
  ...props
}: RadioGroupItemProps) {
  const { state, config, classes, groupDisabled, request } = useRadioGroupContext('RadioGroupItem');
  const isDisabled = groupDisabled || itemDisabled;
  const aria = radioItemAria(value, state, config);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a custom radio with a visual dot is not expressible with a native input
    <button
      type="button"
      role="radio"
      data-part="item"
      data-value={value}
      disabled={isDisabled}
      className={classy(classes.item, className)}
      {...aria}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        request(value);
      }}
      {...props}
    >
      <span data-part="indicator" className={classes.indicator} aria-hidden="true" />
      {children}
    </button>
  );
}

RadioGroupItem.displayName = 'RadioGroupItem';

export default RadioGroup;
