/**
 * Adjoins a text control with leading/trailing affixes -- a currency symbol, a
 * unit, a search icon, an action button -- into one box with one border and one
 * focus ring. The group supplies chrome and the disabled/validity rules; the
 * contained control keeps its own value, caret, and form participation.
 *
 * @cognitive-load 3/10 - decision 0, information 2, interaction 1, disruption 0,
 * learning 0. The group asks nothing of the user; the affixes ADD information
 * (what unit, what currency, what this field searches) that a bare input would
 * otherwise have to spend its placeholder on, and interaction is just the
 * familiar act of typing into a field.
 * @attention-economics Affixes are context, not competition: muted foreground,
 * no fill by default, and never wider than their content. Reading order puts the
 * leading affix before the value so a currency symbol is understood before the
 * number is typed. An action button in a trailing affix is the one element that
 * may claim attention, and only after the field holds a value.
 * @trust-building One border and one focus ring around the whole assembly tell
 * the user this is a single control, not a row of loosely arranged pieces. A
 * disabled group disables its affix buttons too, so nothing inside a dead
 * control looks clickable -- the honesty that stops a user testing whether it
 * still works.
 * @accessibility The affixes are decoration around the control, not
 * replacements for its name: an icon affix must be aria-hidden and the control
 * still needs a real label (Field, or aria-label). The score puts no nameless
 * role="group" on the wrapper, projects aria-invalid onto the CONTROL where
 * assistive tech expects validity, and propagates disabled to every focusable
 * descendant so a dead group holds no reachable tab stop. The focus ring is a
 * focus-within ring, so keyboard focus is always visible wherever it lands.
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  addonPart,
  inputGroupBehavior,
  isControlDisabled,
  type InputGroupAddonPosition,
  type InputGroupConfig,
  type InputGroupSize,
} from './input-group.behavior';
import {
  composeInputGroupAddonClasses,
  inputGroupClassSet,
  type InputGroupAddonVariant,
} from './input-group.classes';

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
