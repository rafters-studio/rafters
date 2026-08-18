/**
 * Toggle group component for grouped toggle selections
 *
 * @cognitive-load 3/10 - Multiple options with clear selection state
 * @attention-economics Option group: all options visible, selected state prominent
 * @trust-building Immediate visual feedback, clear selection state, reversible
 * @accessibility Roving focus for keyboard navigation, proper ARIA pressed states
 * @semantic-meaning Selection modes: single=mutually exclusive (like radio), multiple=independent (like checkboxes)
 *
 * @usage-patterns
 * DO: Use single mode for mutually exclusive view/format options
 * DO: Use multiple mode for independent feature toggles
 * DO: Keep options visually grouped and styled consistently
 * DO: Limit to 2-5 options for scannability
 * NEVER: More than 7 options, complex nested selections
 *
 * @example
 * ```tsx
 * // Single selection (view mode)
 * <ToggleGroup type="single" defaultValue="grid">
 *   <ToggleGroup.Item value="grid"><Grid /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="list"><List /></ToggleGroup.Item>
 * </ToggleGroup>
 *
 * // Multiple selection (text formatting)
 * <ToggleGroup type="multiple">
 *   <ToggleGroup.Item value="bold"><Bold /></ToggleGroup.Item>
 *   <ToggleGroup.Item value="italic"><Italic /></ToggleGroup.Item>
 * </ToggleGroup>
 * ```
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createRovingFocus } from '../../primitives/roving-focus';
import {
  emitValue,
  orientationOf,
  selectedValues,
  toggleGroup,
  toggleItemAria,
  type ToggleGroupConfig,
  type ToggleGroupPart,
  type ToggleGroupState,
} from './toggle-group.behavior';
import { toggleGroupClasses, type ToggleGroupClassSet } from './toggle-group.classes';

interface ToggleGroupContextValue {
  state: ToggleGroupState;
  config: ToggleGroupConfig;
  classes: ToggleGroupClassSet;
  groupDisabled: boolean;
  request: (value: string) => boolean;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext(component: string): ToggleGroupContextValue {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error(`${component} must be used within <ToggleGroup>`);
  }
  return context;
}

/** Order-insensitive set equality: selection is by value, order is not state. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

export interface ToggleGroupProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Selection mode: single allows one (collapsible), multiple allows any number. */
  type?: 'single' | 'multiple';
  /** Controlled value: string for single, string[] for multiple. */
  value?: string | string[];
  /** Default value for uncontrolled usage. */
  defaultValue?: string | string[];
  /** Callback when the selection changes via user interaction. */
  onValueChange?: (value: string | string[]) => void;
  /** Visual variant. */
  variant?: 'default' | 'outline';
  /** Size variant. */
  size?: 'default' | 'sm' | 'lg';
  /** Whether all items are disabled. */
  disabled?: boolean;
  /** Layout / arrow-navigation orientation. Default 'horizontal'. */
  orientation?: 'horizontal' | 'vertical';
  /** Advertised via the form surface (see toggle-group.md dispositions). */
  required?: boolean;
  /** Form field name (inert surface; see toggle-group.md dispositions). */
  name?: string;
}

/**
 * Grouped toggle set: coordinates toggle buttons as a single- (collapsible) or
 * multiple-select group. Arrow keys move focus (roving tabindex); Space, Enter,
 * or click toggle the focused item -- selection does NOT follow focus (the
 * toolbar pattern, not the radio pattern).
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 1, disruption 0,
 * learning 0. One decision over a visible few (which option(s) to enable);
 * options are shown side by side so comparison is direct and nothing must be
 * recalled. A universally learned button affordance with no workflow disruption.
 * @attention-economics Options visible simultaneously: the set supports
 * side-by-side comparison and keeps the current selection in view. Best for 2-5
 * options; beyond ~7 a Select reclaims the attention budget.
 * @trust-building Immediate visual feedback on each pressed item, reversible
 * choices, and an always-visible current state. Single mode is collapsible so a
 * user can return to "nothing selected"; multiple mode makes each toggle
 * independent and non-destructive.
 * @accessibility role="group" on the container with per-item aria-pressed +
 * data-state on native <button>s, wired to real DOM by the harness. Roving
 * tabindex keeps exactly one item in the tab order; arrow keys move focus;
 * Space/Enter/click activate. Disabled items leave the tab order (native
 * disabled) and are skipped by roving.
 */
export function ToggleGroup({
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  variant = 'default',
  size = 'default',
  disabled = false,
  orientation = 'horizontal',
  required = false,
  name,
  className,
  children,
  ...props
}: ToggleGroupProps) {
  const config: ToggleGroupConfig = {
    type,
    value,
    defaultValue,
    orientation,
    disabled,
    required,
    name,
    variant,
    size,
  };

  // The controller composes the score with the substrate -- no useBehavior.
  // createBehavior is the model; useMemory subscribes React to it; the effect
  // below composes the roving-focus primitive directly against the root.
  const { memory, dispatch } = React.useMemo(() => createBehavior(toggleGroup, config), []);
  const state = useMemory(memory);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<ToggleGroupPart>;
    for (const part of Object.keys(toggleGroup.parts) as ToggleGroupPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Gotcha #1: the controlled callback compares the EFFECTIVE value before
  // against the INTRINSIC value after the reducer -- a controlled group's
  // effective value never moves (config shadows it), but the callback must still
  // report the value to set. canDispatch already gates group-disabled.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    (itemValue: string): boolean => {
      const { config: cfg, onValueChange: cb } = latest.current;
      const before = selectedValues(memory.get(), cfg);
      if (!dispatch('toggle', cfg, itemValue)) return false;
      const after = memory.get().value;
      if (!sameSet(before, after)) cb?.(emitValue(after, cfg));
      return true;
    },
    [memory, dispatch],
  );

  // Compose the roving-focus primitive directly against the root -- it owns the
  // roving tabindex and arrow/Home/End movement across the [data-roving-item]
  // item buttons. Selection does NOT follow focus, so unlike radio-group there
  // is no second keydown effect: activation flows through the item <button>'s
  // native click (Space/Enter included).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return createRovingFocus(root, { orientation: orientationOf(config) });
  }, [orientation]);

  const aria = toggleGroup.aria(state, config, ids);
  const classes = toggleGroupClasses(config, state);

  const contextValue: ToggleGroupContextValue = {
    state,
    config,
    classes,
    groupDisabled: disabled,
    request,
  };

  return (
    <ToggleGroupContext.Provider value={contextValue}>
      {/* biome-ignore lint/a11y/useSemanticElements: role="group" is correct for a toggle group per WAI-ARIA APG; fieldset is for form controls */}
      <div
        ref={rootRef}
        data-part="root"
        id={ids.root}
        role="group"
        data-type={type}
        data-name={name}
        className={classy(classes.root, className)}
        {...aria.root}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

ToggleGroup.displayName = 'ToggleGroup';

export interface ToggleGroupItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  /** Value that identifies this toggle item. */
  value: string;
}

export function ToggleGroupItem({
  value,
  className,
  children,
  disabled: itemDisabled,
  onClick,
  ...props
}: ToggleGroupItemProps) {
  const { state, config, classes, groupDisabled, request } =
    useToggleGroupContext('ToggleGroupItem');
  const isDisabled = groupDisabled || itemDisabled;
  const aria = toggleItemAria(value, state, config);

  return (
    <button
      type="button"
      data-part="item"
      data-value={value}
      data-roving-item
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
      {children}
    </button>
  );
}

ToggleGroupItem.displayName = 'ToggleGroupItem';

ToggleGroup.Item = ToggleGroupItem;

export default ToggleGroup;
