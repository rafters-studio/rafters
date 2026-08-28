/**
 * InputGroup combines an input with visual addons (icons, buttons, text) for enhanced form UX
 *
 * @cognitive-load 4/10 - Composite input control with clear addon boundaries and input focus
 * @attention-economics Visual hierarchy: addons=contextual, input=primary focus. Addons should clarify input purpose without competing for attention
 * @trust-building Clear boundaries between addons and input, consistent sizing, proper focus management across the group
 * @accessibility Focus ring wraps entire group, addons support aria-label for screen readers, keyboard navigation preserved
 * @semantic-meaning Start addons=prefixes (currency symbols, icons), end addons=suffixes (units, action buttons)
 *
 * @usage-patterns
 * DO: Use start addon for input type indicators (search icon, currency symbol)
 * DO: Use end addon for units, clear buttons, or submit actions
 * DO: Keep addons visually lightweight to not overshadow input
 * DO: Ensure addons have proper accessibility labels when using icons
 * NEVER: Use addons without semantic meaning
 * NEVER: Place primary actions in addons (use a separate button instead)
 * NEVER: Nest input groups
 *
 * @example
 * ```tsx
 * // Search input with icon
 * <InputGroup>
 *   <InputGroupAddon position="start">
 *     <SearchIcon aria-hidden />
 *   </InputGroupAddon>
 *   <Input placeholder="Search..." aria-label="Search" />
 * </InputGroup>
 *
 * // Price input with currency and unit
 * <InputGroup>
 *   <InputGroupAddon position="start">$</InputGroupAddon>
 *   <Input type="number" placeholder="0.00" />
 *   <InputGroupAddon position="end">USD</InputGroupAddon>
 * </InputGroup>
 *
 * // Input with button addon
 * <InputGroup>
 *   <Input placeholder="Enter code" />
 *   <InputGroupAddon position="end">
 *     <Button size="sm" variant="ghost">Apply</Button>
 *   </InputGroupAddon>
 * </InputGroup>
 * ```
 */
import * as React from 'react';
import classy from '@/lib/primitives/classy';
import {
  addonPart,
  inputGroupBehavior,
  isControlDisabled,
  type InputGroupAddonPosition,
  type InputGroupConfig,
  type InputGroupSize,
} from '@/components/ui/input-group.behavior';
import {
  composeInputGroupAddonClasses,
  inputGroupClassSet,
  type InputGroupAddonVariant,
} from '@/components/ui/input-group.classes';

export type { InputGroupAddonPosition, InputGroupAddonVariant, InputGroupSize };

// ==================== Config distribution (React-only affordance) ====================

interface InputGroupContextValue {
  config: InputGroupConfig;
}

const InputGroupContext = React.createContext<InputGroupContextValue | null>(null);

/**
 * Read the enclosing group's config from a child. Returns null outside a group,
 * so `InputGroupInput` and `InputGroupAddon` still render standalone.
 *
 * Context DISTRIBUTES config; it decides nothing. Every rule the children apply
 * -- the disabled OR, the validity projection -- is read back out of
 * `input-group.behavior.ts`. The Web Component and Astro performances reach the
 * same children through the DOM in `bindInputGroup`, which is why the seam is a
 * framework affordance rather than a second source of truth.
 */
export function useInputGroupContext(): InputGroupContextValue | null {
  return React.useContext(InputGroupContext);
}

// ==================== InputGroup ====================

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Control height, shared with the standalone input's vocabulary. */
  size?: InputGroupSize;
  /** Disables the whole assembly, affix buttons included. */
  disabled?: boolean;
  /** Advertised to AT via aria-invalid on the contained control; turns the
   *  group's border destructive. */
  invalid?: boolean;
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ size = 'default', disabled = false, invalid = false, className, children, ...props }, ref) => {
    const config: InputGroupConfig = { size, disabled, invalid };
    const classes = inputGroupClassSet(config, {});

    // A static score: no state, no ids, no memory -- config in, classes + aria
    // out (the button-group/field shape, no useBehavior). The projection ignores
    // ids, so an empty set is passed.
    const projection = inputGroupBehavior.aria({}, config, {
      root: '',
      control: '',
      addonStart: '',
      addonEnd: '',
    });

    const contextValue = React.useMemo<InputGroupContextValue>(
      () => ({ config: { size, disabled, invalid } }),
      [size, disabled, invalid],
    );

    return (
      <InputGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-part="root"
          data-size={size}
          data-disabled={disabled ? '' : undefined}
          className={classy(classes.root, className)}
          {...projection.root}
          {...props}
        >
          {children}
        </div>
      </InputGroupContext.Provider>
    );
  },
);

InputGroup.displayName = 'InputGroup';

// ==================== InputGroupAddon ====================

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which side of the control this affix sits on. */
  position: InputGroupAddonPosition;
  /** Fill treatment. Decoration only. */
  variant?: InputGroupAddonVariant;
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ position, variant = 'default', className, ...props }, ref) => {
    // The part name and the data-position both come from the score, so the
    // decorator picks no names of its own.
    const part = addonPart(position);
    const projection = inputGroupBehavior.aria(
      {},
      {},
      { root: '', control: '', addonStart: '', addonEnd: '' },
    );

    return (
      <div
        ref={ref}
        data-part={part}
        className={classy(composeInputGroupAddonClasses(position, variant), className)}
        {...projection[part]}
        {...props}
      />
    );
  },
);

InputGroupAddon.displayName = 'InputGroupAddon';

// ==================== InputGroupInput ====================

export interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * The control inside the group. A bare `<input>` that renders no chrome of its
 * own (the group owns border, radius, and ring) and keeps every native
 * affordance -- value, caret, IME, selection, form participation. The group's
 * disabled and validity reach it through the score, not through markup.
 */
export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, type = 'text', disabled = false, ...props }, ref) => {
    const context = useInputGroupContext();
    const config: InputGroupConfig = context?.config ?? {};
    const classes = inputGroupClassSet(config, {});

    // The disabled rule lives in the score: the group's disabled wins, and an
    // enabled group never re-enables an individually disabled control.
    const effectiveDisabled = isControlDisabled(config, disabled);
    const projection = inputGroupBehavior.aria({}, config, {
      root: '',
      control: '',
      addonStart: '',
      addonEnd: '',
    });

    return (
      <input
        ref={ref}
        data-part="control"
        type={type}
        disabled={effectiveDisabled}
        className={classy(classes.control, className)}
        {...projection.control}
        {...props}
      />
    );
  },
);

InputGroupInput.displayName = 'InputGroupInput';

export default InputGroup;
