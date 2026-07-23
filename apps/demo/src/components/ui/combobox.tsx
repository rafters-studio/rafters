/**
 * Combobox: a filtering autocomplete input paired with a listbox of options.
 *
 * @cognitive-load 6/10 - Holds three things at once: the free-text query, the
 *   filtered option set, and the current highlight; typing and scanning run in
 *   parallel, heavier than a plain Select.
 * @attention-economics Closed it reads as a single input; typing narrows the
 *   option list so attention collapses onto the matches, and the highlight plus
 *   aria-activedescendant keep one focal option at a time.
 * @trust-building Immediate filter feedback, an explicit empty state when nothing
 *   matches, a visible checkmark on the committed option, and keyboard-first
 *   navigation that never moves focus off the field.
 * @accessibility Editable combobox APG pattern: role="combobox" with
 *   aria-autocomplete="list" on the input, aria-expanded/aria-controls to the
 *   listbox, and aria-activedescendant tracking the highlighted option so screen
 *   readers announce it without stealing DOM focus.
 *
 * The React performance is a DECORATOR over combobox.behavior.ts: it adds only
 * the view (combobox.classes.ts) and React wiring (useMemory + a useEffect that
 * positions and light-dismisses, plus the dispatch protocol). Every decision --
 * reducers, aria, keymap, the filter predicate -- lives in the score. The shadcn
 * drop-in surface (Input, Content, Empty, Group, Item, Separator) plus the
 * `Combobox.*` namespace is preserved as thin view wrappers.
 *
 * @example
 * ```tsx
 * import { Combobox } from '@rafters/ui';
 *
 * <Combobox onValueChange={save}>
 *   <Combobox.Input placeholder="Select framework..." />
 *   <Combobox.Content>
 *     <Combobox.Empty>No framework found.</Combobox.Empty>
 *     <Combobox.Item value="react">React</Combobox.Item>
 *     <Combobox.Item value="vue">Vue</Combobox.Item>
 *   </Combobox.Content>
 * </Combobox>
 * ```
 */
import * as React from 'react';
import { keyInputOf } from '@/hooks/key-input';
import { useMemory } from '@/hooks/use-memory';
import { createBehavior, type AriaAttrs, type PartIds, type PayloadArgs } from '@/lib/contract';
import classy from '@/lib/primitives/classy';
import { onPointerDownOutside } from '@/lib/primitives/outside-click';
import {
  combobox,
  comboboxItemAria,
  isOpen,
  matchesQuery,
  positionCombobox,
  selectedValue,
  visibleOptionValues,
  type ComboboxActions,
  type ComboboxConfig,
  type ComboboxPart,
  type ComboboxState,
} from '@/components/ui/combobox.behavior';
import { comboboxClasses, type ComboboxClassSet } from '@/components/ui/combobox.classes';

interface ComboboxContextValue {
  state: ComboboxState;
  config: ComboboxConfig;
  ids: PartIds<ComboboxPart>;
  aria: Partial<Record<ComboboxPart, AriaAttrs>>;
  request: <K extends keyof ComboboxActions>(
    action: K,
    ...payload: PayloadArgs<ComboboxActions[K]>
  ) => boolean;
  getPart: (part: string) => HTMLElement | null;
  effectiveOpen: boolean;
  effectiveValue: string;
  query: string;
  disabled: boolean;
  classes: ComboboxClassSet;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext(component: string): ComboboxContextValue {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error(`${component} must be used within <Combobox>`);
  }
  return context;
}

/** Checkmark shown on the committed option. */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export interface ComboboxProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Combobox({
  children,
  value,
  defaultValue = '',
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: ComboboxProps) {
  const config: ComboboxConfig = { value, defaultValue, open, defaultOpen, disabled };

  const { memory, dispatch } = React.useMemo(() => createBehavior(combobox, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);
  const effectiveValue = selectedValue(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<ComboboxPart>;
    for (const part of Object.keys(combobox.parts) as ComboboxPart[]) out[part] = `${uid}-${part}`;
    return out;
  }, [uid]);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const getPart = React.useCallback(
    (part: string): HTMLElement | null =>
      part === 'root'
        ? rootRef.current
        : (rootRef.current?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null),
    [],
  );

  // Effect-initiated dispatches (outside dismissal) must read the CURRENT config
  // and callbacks, so those ride in a ref rather than being captured stale.
  const latest = React.useRef({ config, onValueChange, onOpenChange });
  latest.current = { config, onValueChange, onOpenChange };
  const request = React.useCallback(
    <K extends keyof ComboboxActions>(
      action: K,
      ...payload: PayloadArgs<ComboboxActions[K]>
    ): boolean => {
      const { config: cfg, onValueChange: onValue, onOpenChange: onOpen } = latest.current;
      // Effective-before vs intrinsic-after, on BOTH axes: a controlled
      // combobox's effective value/open never moves, but the callback must still
      // report what it should set next.
      const openBefore = isOpen(memory.get(), cfg);
      const valueBefore = selectedValue(memory.get(), cfg);
      if (!dispatch(action, cfg, ...payload)) return false;
      const after = memory.get();
      if (after.value !== valueBefore) onValue?.(after.value);
      if (after.open !== openBefore) onOpen?.(after.open);
      return true;
    },
    [memory, dispatch],
  );

  // Position the listbox against the input and light-dismiss on outside
  // pointerdown -- the same two affordances bindCombobox composes, level-
  // triggered on the open axis. Positioning follows scroll/resize while open.
  React.useEffect(() => {
    if (!effectiveOpen) return;
    const input = getPart('input');
    const content = getPart('content');
    if (!content) return;
    const reposition = () => positionCombobox(input, content, {});
    reposition();
    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    const stopDismiss = onPointerDownOutside(content, (event) => {
      const target = event.target as Node;
      if (getPart('input')?.contains(target)) return;
      if (getPart('trigger')?.contains(target)) return;
      request('close');
    });
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', reposition);
      stopDismiss();
    };
  }, [effectiveOpen, getPart, request]);

  // One root-level keydown resolves the focused part and drives the score,
  // mirroring bindCombobox -- so the input/item view wrappers stay pure
  // change/click/pointer adapters with no keymap logic of their own.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as ComboboxPart | undefined;
    if (!part) return;
    const action = combobox.keymap(keyInputOf(event), state, part, config);
    if (!action) return;
    if (action === 'highlightNext' || action === 'highlightPrev') {
      if (disabled) return;
      event.preventDefault();
      request(action, visibleOptionValues(getPart('content')));
      return;
    }
    if (action === 'select') {
      const value = memory.get().highlighted;
      if (value === undefined) return;
      const item = getPart('content')?.querySelector<HTMLElement>(
        `[data-part="item"][data-value="${value}"]`,
      );
      if (!item || item.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      request('select', { value, label: (item.textContent ?? '').trim() });
      return;
    }
    if (action === 'close') {
      if (event.key === 'Escape') event.preventDefault();
      request('close');
    }
  };

  const aria = combobox.aria(state, config, ids);
  const classes = comboboxClasses(config, state);

  const contextValue: ComboboxContextValue = {
    state,
    config,
    ids,
    aria,
    request,
    getPart,
    effectiveOpen,
    effectiveValue,
    query: state.query,
    disabled,
    classes,
  };

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        id={ids.root}
        {...aria.root}
        className={classes.root}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

export interface ComboboxInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {}

export function ComboboxInput({ className, ...props }: ComboboxInputProps) {
  const { ids, aria, request, query, effectiveOpen, getPart, disabled, classes } =
    useComboboxContext('Combobox.Input');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    request('setQuery', event.target.value);
  };

  const handleToggle = () => {
    if (disabled) return;
    request(effectiveOpen ? 'close' : 'open');
    // Keep focus on the input after a pointer toggle.
    getPart('input')?.focus();
  };

  return (
    <div data-part="field" className={classes.field}>
      <input
        data-part="input"
        id={ids.input}
        type="text"
        autoComplete="off"
        value={query}
        disabled={disabled}
        onChange={handleChange}
        className={classy(classes.input, className)}
        {...aria.input}
        {...props}
      />
      <button
        type="button"
        data-part="trigger"
        tabIndex={-1}
        {...aria.trigger}
        onClick={handleToggle}
        className={classes.trigger}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={classes.chevron}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

export interface ComboboxContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ComboboxContent({ className, children, ...props }: ComboboxContentProps) {
  const { ids, aria, effectiveOpen, classes } = useComboboxContext('Combobox.Content');
  return (
    <div
      data-part="content"
      id={ids.content}
      hidden={effectiveOpen ? undefined : true}
      className={classy(classes.content, className)}
      {...aria.content}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ComboboxEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ComboboxEmpty({ className, children, ...props }: ComboboxEmptyProps) {
  const { state, getPart, classes } = useComboboxContext('Combobox.Empty');
  // Shown only when the filter leaves no visible option. Read after render so
  // the count reflects the items React has committed (DOM read in an effect).
  const [hasVisible, setHasVisible] = React.useState(true);
  React.useEffect(() => {
    setHasVisible(visibleOptionValues(getPart('content')).length > 0);
  }, [state.query, getPart]);

  return (
    <div
      data-part="empty"
      hidden={hasVisible ? true : undefined}
      className={classy(classes.empty, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ComboboxGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export function ComboboxGroup({ heading, className, children, ...props }: ComboboxGroupProps) {
  const { classes } = useComboboxContext('Combobox.Group');
  const headingId = React.useId();
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is the WAI-ARIA role for grouping listbox options
    <div
      role="group"
      aria-labelledby={heading ? headingId : undefined}
      className={classy(classes.group, className)}
      {...props}
    >
      {heading &&
        React.createElement('div', { id: headingId, className: classes.groupLabel }, heading)}
      {children}
    </div>
  );
}

export interface ComboboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export function ComboboxItem({
  value: itemValue,
  disabled = false,
  className,
  children,
  onClick,
  onPointerMove,
  ...props
}: ComboboxItemProps) {
  const { state, config, ids, request, getPart, query, classes } =
    useComboboxContext('Combobox.Item');
  const label = typeof children === 'string' ? children : itemValue;
  const aria = comboboxItemAria(itemValue, state, config);
  const isSelected = selectedValue(state, config) === itemValue;
  // Filter in place (hidden, not unmounted) so the option id stays stable for
  // aria-activedescendant across queries.
  const filtered = !matchesQuery(label, itemValue, query);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    request('select', { value: itemValue, label });
    getPart('input')?.focus();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (!disabled) request('highlight', itemValue);
  };

  const indicator = React.createElement(
    'span',
    { className: classes.itemIndicator },
    isSelected ? <CheckIcon /> : null,
  );
  const text = React.createElement('span', { className: classes.itemText }, children);

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="option" is the listbox APG pattern
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard navigation runs on the combobox input, not the option
    <div
      role="option"
      data-part="item"
      id={`${ids.content}-option-${itemValue}`}
      data-value={itemValue}
      data-disabled={disabled ? '' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      hidden={filtered ? true : undefined}
      className={classy(classes.item, className)}
      {...aria}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      {...props}
    >
      {indicator}
      {text}
    </div>
  );
}

export interface ComboboxSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ComboboxSeparator({ className, ...props }: ComboboxSeparatorProps) {
  const { classes } = useComboboxContext('Combobox.Separator');
  return <div aria-hidden="true" className={classy(classes.separator, className)} {...props} />;
}

Combobox.Input = ComboboxInput;
Combobox.Content = ComboboxContent;
Combobox.Empty = ComboboxEmpty;
Combobox.Group = ComboboxGroup;
Combobox.Item = ComboboxItem;
Combobox.Separator = ComboboxSeparator;

export { Combobox as ComboboxRoot };
