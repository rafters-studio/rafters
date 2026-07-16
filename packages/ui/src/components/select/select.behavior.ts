import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { createEffectRunner, type EffectHost, type EffectSpec } from '../../lib/effects';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { formValueAttrs } from '../../primitives/form-value';

/**
 * Select: a listbox picker. The trigger (a combobox button) discloses a
 * listbox; picking an option persists the value, fires the change, and
 * closes. Replaces the imperative old/ui/select.controller.ts +
 * old/ui/select.tsx wholesale.
 *
 * The three state axes are `open`, `value`, and `highlighted`:
 *  - open/value follow the controlled-vs-intrinsic boundary (config shadows
 *    state; the effective read is isOpen/selectedValue), like dialog & nav.
 *  - highlighted is the option the user is currently pointed at. It MIRRORS
 *    DOM focus: roving-focus (arrows), typeahead (type-to-jump), pointer
 *    move, and open-focus all move focus to an option, and the binding's
 *    focus listener turns that into a highlight. Nothing sets highlighted
 *    without focus following, so there is only ever one visibly active option.
 *
 * Dropped from the old code on purpose (React-specific machinery, not earned
 * select semantics): the `labelVersion` bottom-up label registry -- here the
 * listbox lives in light DOM present-but-hidden (dialog/nav pattern), so the
 * trigger's value text reads the selected option's textContent directly.
 * Collision positioning is not behavior state and is not in the effect
 * vocabulary, so it is not modelled here (tracked disposition: reduced
 * positioning fidelity vs the old React-only computePosition).
 */
export interface SelectConfig {
  /** Controlled value ('' = no selection). */
  value?: string | undefined;
  /** Uncontrolled seed. */
  defaultValue?: string | undefined;
  /** Controlled open. */
  open?: boolean | undefined;
  /** Uncontrolled seed. */
  defaultOpen?: boolean | undefined;
  /** Disable the whole control. */
  disabled?: boolean | undefined;
  /** Form field name -- drives the mirrored hidden input (form-value). */
  name?: string | undefined;
}

export interface SelectState {
  open: boolean;
  /** Intrinsic selected value ('' = no selection). */
  value: string;
  /** The option the user is currently pointed at (mirrors DOM focus). */
  highlighted: string | undefined;
}

export type SelectActions = {
  /** Open the listbox. */
  open: undefined;
  /** Close the listbox; clears the highlight (ported handleOpenChange reset). */
  close: undefined;
  /** User pick: set value, fire change, close, clear highlight (payload: value). */
  select: string;
  /** Mirror the currently focused option into the highlight (payload: value). */
  highlight: string;
};

export type SelectPart = 'root' | 'trigger' | 'content' | 'item';

/** The effective open: controlled config shadows intrinsic state. */
export function isOpen(state: SelectState, config: SelectConfig): boolean {
  return config.open ?? state.open;
}

/** The effective value: controlled config shadows intrinsic state. */
export function selectedValue(state: SelectState, config: SelectConfig): string {
  return config.value ?? state.value;
}

const selectSlice: Slice<SelectConfig, SelectState, SelectActions, SelectPart> = {
  name: 'select',
  parts: {
    root: {},
    trigger: {},
    // Listbox stays in light DOM, hidden when closed: the roving/typeahead/
    // dismiss effects read it, and the trigger's value text is read from the
    // selected option. Presence is constant; visibility is state.
    content: { optional: true },
    item: { many: true },
  },
  initialState: (config) => ({
    open: config.open ?? config.defaultOpen ?? false,
    value: config.value ?? config.defaultValue ?? '',
    highlighted: undefined,
  }),
  actions: {
    open: (state) => ({ ...state, open: true }),
    // Closing clears the keyboard highlight (ported handleOpenChange reset).
    close: (state) => ({ ...state, open: false, highlighted: undefined }),
    // The one action that moves value AND open: set, close, clear highlight.
    select: (state, value) => ({ ...state, value, open: false, highlighted: undefined }),
    highlight: (state, value) => ({ ...state, highlighted: value }),
  },
  // Idempotence gate on the open axis so consumer callbacks fire once per
  // real transition (like disclosable). select/highlight are always allowed.
  canDispatch: (state, action, config) => {
    if (action === 'open') return !isOpen(state, config);
    if (action === 'close') return isOpen(state, config);
    return true;
  },
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    const disabled = config.disabled ?? false;
    return {
      root: {
        'data-state': open ? 'open' : 'closed',
        'data-disabled': disabled ? '' : undefined,
      },
      trigger: {
        role: 'combobox',
        'aria-haspopup': 'listbox',
        'aria-expanded': open ? 'true' : 'false',
        // Empty-id sentinel: reference the listbox only when it is open and its
        // id is real, so an initially-closed trigger leaks no dangling ref.
        'aria-controls': open && ids.content ? ids.content : undefined,
        'aria-disabled': disabled ? 'true' : undefined,
        'data-state': open ? 'open' : 'closed',
        'data-disabled': disabled ? '' : undefined,
      },
      content: {
        role: 'listbox',
        // The listbox is named by the combobox that controls it.
        'aria-labelledby': ids.trigger || undefined,
        'data-state': open ? 'open' : 'closed',
      },
    };
  },
  keymap: (event, _state, part, _config) => {
    if (part === 'trigger') {
      // Open on ArrowDown/ArrowUp/Enter/Space; canDispatch drops it if already
      // open. Native <button> also fulfils Enter/Space via click.
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        return 'open';
      }
      return null;
    }
    // Focus is inside the listbox on an option (or the listbox itself).
    if (part === 'content' || part === 'item') {
      if (event.key === 'Escape') return 'close';
      // Enter/Space commit the focused option; the binding reads its value.
      if (event.key === 'Enter' || event.key === ' ') return 'select';
    }
    return null;
  },
  effects: (state, config): EffectSpec[] => {
    if (!isOpen(state, config)) return [];
    return [
      { type: 'roving-focus', part: 'content', orientation: 'vertical' },
      { type: 'typeahead', part: 'content' },
      // Outside pointerdown closes; the trigger toggles instead of
      // close-then-open on the same gesture.
      { type: 'dismiss-on-outside', part: 'content', action: 'close', exceptParts: ['trigger'] },
    ];
  },
};

export const select: BehaviorSpec<SelectConfig, SelectState, SelectActions, SelectPart> = compose(
  'select',
  selectSlice,
);

/**
 * Per-instance projection for the many-instance `item` part. Spec 01's aria()
 * projects one AriaAttrs per part NAME; options occur once per value, so their
 * projection takes the instance value (mirrors navTriggerAria). role, tabindex,
 * data-value, data-roving-item and aria-disabled are static markup.
 */
export function selectItemAria(
  itemValue: string,
  state: SelectState,
  config: SelectConfig,
): AriaAttrs {
  const selected = selectedValue(state, config) === itemValue;
  const highlighted = state.highlighted === itemValue;
  return {
    'aria-selected': selected ? 'true' : 'false',
    'data-state': selected ? 'checked' : 'unchecked',
    'data-highlighted': highlighted ? '' : undefined,
  };
}

/** The display label for a value: the selected option's trimmed text, read
 *  from the light-DOM listbox. Undefined when nothing is selected or the
 *  option is not present (the decorator then shows the placeholder). */
export function selectedLabel(content: HTMLElement | null, value: string): string | undefined {
  if (!content || value === '') return undefined;
  for (const item of content.querySelectorAll<HTMLElement>('[data-part="item"]')) {
    if (item.dataset['value'] === value) return (item.textContent ?? '').trim();
  }
  return undefined;
}

/** Move focus to the selected option, or the first enabled one -- the
 *  open-focus semantic (keyboard users land on the current value). Shared by
 *  the bind and the React decorator so all three performances behave alike. */
export function focusSelectedOption(content: HTMLElement | null, value: string): void {
  if (!content) return;
  const items = Array.from(content.querySelectorAll<HTMLElement>('[data-part="item"]')).filter(
    (item) => !item.hasAttribute('data-disabled') && item.getAttribute('aria-disabled') !== 'true',
  );
  if (items.length === 0) return;
  const target = items.find((item) => item.dataset['value'] === value) ?? items[0];
  target?.focus();
}

/**
 * The DOM-native binding of the select score -- the client. The Web Component
 * and the Astro <script> both import THIS; only React (retained-mode) reads the
 * projections declaratively. Same shape as bindDialog/bindNavigationMenu, plus
 * the select concerns: presence (content hidden off the open axis), the value
 * text mirror, the hidden-input form-value mirror, focus mirroring into
 * highlight, and open-focus of the selected option.
 */
export function bindSelect(root: HTMLElement): () => void {
  const contentEl = root.querySelector<HTMLElement>('[data-part="content"]');
  const config: SelectConfig = {
    disabled: root.hasAttribute('disabled') || root.dataset['disabled'] === '',
    defaultValue: root.getAttribute('value') ?? undefined,
    defaultOpen: contentEl?.dataset['state'] === 'open',
    name: root.getAttribute('name') ?? undefined,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(select, config);
  const runner = createEffectRunner();

  const request = (action: keyof SelectActions, payload?: string): boolean =>
    dispatch(action, config, ...((payload === undefined ? [] : [payload]) as [string]));

  const host: EffectHost = {
    getPart,
    dispatch: (action, payload) =>
      void request(action as keyof SelectActions, payload as string | undefined),
  };

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<SelectPart>;
  for (const part of Object.keys(select.parts) as SelectPart[]) ids[part] = getPart(part)?.id ?? '';

  // Resolved projection: apply raw (validate:false skips aria-manager's
  // author-input coercion that would flip the string 'false' to truthy).
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const value = selectedValue(state, config);

    const projection = select.aria(state, config, ids);
    for (const part of Object.keys(projection) as SelectPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Per-instance option projection.
    for (const el of root.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      const itemValue = el.dataset['value'];
      if (itemValue === undefined) continue;
      applyProjection(el, selectItemAria(itemValue, state, config));
    }

    // Presence: the listbox hides off the open axis (stays in light DOM).
    if (contentEl) contentEl.hidden = !open;

    // Value text mirror: the selected option's label, else the placeholder.
    const valueEl = getPart('value');
    if (valueEl) {
      const label = selectedLabel(contentEl, value);
      const isEmpty = label === undefined;
      valueEl.textContent = isEmpty ? (valueEl.dataset['placeholder'] ?? '') : label;
      valueEl.toggleAttribute('data-empty', isEmpty);
    }

    // Form-value mirror: keep the hidden input's value in sync.
    const input = root.querySelector<HTMLInputElement>('input[data-part="hidden-input"]');
    if (input) input.value = value;

    runner.apply(select.effects(state, config), host);

    // Open-focus: land on the selected (or first) option when the listbox
    // opens and focus is not already inside it. Once focus is in, subsequent
    // renders see it contained and do not steal it back.
    if (open && contentEl && !contentEl.contains(document.activeElement)) {
      focusSelectedOption(contentEl, value);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const isDisabledItem = (item: HTMLElement): boolean =>
    item.hasAttribute('data-disabled') || item.getAttribute('aria-disabled') === 'true';

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-part="item"]');
    if (item && root.contains(item)) {
      if (isDisabledItem(item)) return;
      const value = item.dataset['value'];
      if (value !== undefined) {
        request('select', value);
        getPart('trigger')?.focus();
      }
      return;
    }
    const trigger = target.closest<HTMLElement>('[data-part="trigger"]');
    if (trigger && root.contains(trigger)) {
      if (config.disabled) return;
      request(isOpen(memory.get(), config) ? 'close' : 'open');
    }
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as SelectPart | undefined;
    if (!part) return;
    const action = select.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      part,
      config,
    );
    if (!action) return;
    if (action === 'open') {
      if (config.disabled) return;
      event.preventDefault();
      request('open');
      return;
    }
    if (action === 'close') {
      event.preventDefault();
      request('close');
      getPart('trigger')?.focus();
      return;
    }
    if (action === 'select') {
      const item = partEl?.closest<HTMLElement>('[data-part="item"]');
      const value = item?.dataset['value'];
      if (value !== undefined && item && !isDisabledItem(item)) {
        event.preventDefault();
        request('select', value);
        getPart('trigger')?.focus();
      }
    }
  };
  root.addEventListener('keydown', onKeydown);

  // Focus mirroring: an option gaining focus (roving, typeahead, open-focus)
  // becomes the highlight, so data-highlighted follows the active option.
  const onFocusIn = (event: FocusEvent) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-part="item"]');
    if (item && root.contains(item)) {
      const value = item.dataset['value'];
      if (value !== undefined) request('highlight', value);
    }
  };
  root.addEventListener('focusin', onFocusIn);

  // Pointer over an option focuses it (Radix-style), routing through the same
  // focus-mirror so the highlight tracks the pointer too.
  const onPointerMove = (event: Event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-part="item"]');
    if (item && root.contains(item) && !isDisabledItem(item)) item.focus();
  };
  root.addEventListener('pointermove', onPointerMove);

  return () => {
    unsubscribe();
    runner.stop();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('pointermove', onPointerMove);
  };
}

export { formValueAttrs };
