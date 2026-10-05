import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createInputHandler } from '../../primitives/input-events';
import { createKeyboardHandler } from '../../primitives/keyboard-handler';

/**
 * InputOTP: a segmented one-time-code field. One character per visible slot,
 * auto-advance as the code is typed, paste splits across every slot.
 *
 * The archetype is text-input (Spec 05): the primary state is a VALUE. The
 * segmented look is a MIRROR -- a single real <input> holds the code, owns the
 * caret, IME and selection, and carries the accessible name; the slots are
 * painted from the value. That is the oracle's shape and it is preserved: a
 * per-slot <input> array would break paste, break autofill of
 * `autocomplete="one-time-code"`, and turn one field into N tab stops.
 *
 * Composition (Spec 05, "compose the primitive, never reimplement it"):
 * - arrow-key slot navigation rides `keyboard-handler` (`createKeyboardHandler`);
 *   the keymap projection is the pure claim record, `activeForKey` computes the
 *   payload.
 * - IME composition tracking rides `input-events` (`createInputHandler`). Only
 *   its composition guard is used: the value path stays on the plain `input`
 *   event, because filtering a half-composed string would eat characters.
 * - the value math (pattern filter + truncation to maxLength, active-slot
 *   resolution) is COMPONENT-INTERNAL pure state -- the exported helpers below,
 *   never inside a reducer (a reducer gets no config, and the math needs
 *   maxLength/pattern).
 *
 * Form association is NOT the `form-value` hidden-mirror: this control has a
 * real native <input>, so a `name` on it submits `name=value` natively. The
 * mirror exists for controls built out of divs (slider's thumbs); rendering one
 * here would submit the field twice. See input-otp.md, dispositions.
 */

/** Per-character pattern the oracle's WC shipped: digits only. */
export const DEFAULT_OTP_PATTERN = '^[0-9]$';

/** Slot count the oracle's WC fell back to for a missing/unparseable maxlength. */
export const DEFAULT_OTP_MAX_LENGTH = 6;

export interface InputOtpConfig {
  /** Number of slots; also the hard cap on the value's length. */
  maxLength: number;
  /**
   * Per-CHARACTER accept test, as a regex SOURCE string so the same config
   * crosses a DOM attribute and an Astro prop unchanged. Malformed sources fall
   * back to digits-only rather than throwing at paint time.
   */
  pattern?: string | undefined;
  /** Controlled value: shadows the intrinsic state when present. */
  value?: string | undefined;
  /** Uncontrolled seed for the intrinsic value. */
  defaultValue?: string | undefined;
  /** No edits and no slot movement while disabled. */
  disabled?: boolean | undefined;
  /** Advertised to AT via aria-required. */
  required?: boolean | undefined;
  /** Accessible name override; absent, the score names the field by slot count. */
  label?: string | undefined;
}

export interface InputOtpState {
  /** Intrinsic value -- ignored while a controlled value is present. Always
   *  already filtered and truncated (the helpers own that math). */
  value: string;
  /** Slot the caret conceptually sits in. Stored UNCLAMPED; `activeSlot`
   *  clamps it against the live maxLength, so shrinking maxLength cannot strand
   *  the active slot past the last rendered one. */
  activeIndex: number;
}

export type InputOtpActions = {
  /** Write an already-filtered, already-truncated value. */
  setValue: string;
  /** Move the active slot to an already-resolved index. */
  setActive: number;
};

export type InputOtpPart = 'root' | 'input' | 'group' | 'slot' | 'separator';

/** The effective value: a controlled `config.value` shadows intrinsic state. */
export function effectiveOtpValue(state: InputOtpState, config: InputOtpConfig): string {
  return config.value ?? state.value;
}

/**
 * The per-character accept test. A malformed source falls back to digits-only:
 * the oracle's WC swallowed the SyntaxError the same way, because a bad
 * `pattern` attribute must not take the whole field down.
 */
export function otpPattern(config: InputOtpConfig): RegExp {
  const source = config.pattern;
  if (!source) return new RegExp(DEFAULT_OTP_PATTERN);
  try {
    return new RegExp(source);
  } catch {
    return new RegExp(DEFAULT_OTP_PATTERN);
  }
}

/**
 * Reject every character the pattern refuses, then stop at maxLength. This is
 * the ONE gate every entry path funnels through -- typing, paste, the
 * programmatic value setter -- so no path can seed a value the slots cannot
 * render. Filtering before truncating is deliberate: pasting "12-34-56" into a
 * six-slot field yields "123456", not "12-34-".
 */
export function filterAndTruncate(raw: string, config: InputOtpConfig): string {
  if (!raw) return '';
  const pattern = otpPattern(config);
  const max = Math.max(0, config.maxLength);
  let out = '';
  for (const char of raw) {
    if (out.length >= max) break;
    if (pattern.test(char)) out += char;
  }
  return out;
}

/** The active slot index, clamped into the rendered slot range. */
export function activeSlot(state: InputOtpState, config: InputOtpConfig): number {
  const last = Math.max(0, config.maxLength - 1);
  return Math.min(Math.max(state.activeIndex, 0), last);
}

/**
 * Whether a slot reads as active. The trailing OR is the oracle's, preserved
 * verbatim: once the code is complete the LAST slot stays lit even after
 * ArrowLeft walks the active index backwards, so a full code never looks like
 * it lost its end. That means a full field can show two active slots -- an
 * earned semantic, not a bug (see input-otp.md, dispositions).
 */
export function isSlotActive(index: number, state: InputOtpState, config: InputOtpConfig): boolean {
  const value = effectiveOtpValue(state, config);
  const last = config.maxLength - 1;
  return (
    index === activeSlot(state, config) || (value.length === config.maxLength && index === last)
  );
}

export interface OtpSlotState {
  /** The character this slot displays, or '' when the slot is empty. */
  char: string;
  /** Whether a character has landed in this slot. */
  filled: boolean;
  /** Whether this slot reads as the caret's slot. */
  active: boolean;
  /** Whether the fake caret paints: the active slot, still empty. */
  caret: boolean;
}

/** Everything a decorator needs to paint one slot. Pure, index-addressed. */
export function slotState(
  index: number,
  state: InputOtpState,
  config: InputOtpConfig,
): OtpSlotState {
  const value = effectiveOtpValue(state, config);
  const char = value[index] ?? '';
  const filled = char !== '';
  const active = isSlotActive(index, state, config);
  return { char, filled, active, caret: active && !filled };
}

/** Whether every slot is filled -- the completion edge the decorators report. */
export function isComplete(state: InputOtpState, config: InputOtpConfig): boolean {
  return config.maxLength > 0 && effectiveOtpValue(state, config).length === config.maxLength;
}

/**
 * The active index a navigation key targets, or `null` when the key does not
 * move the caret. ArrowLeft walks back one slot and stops at the first;
 * ArrowRight lands on the first EMPTY slot (value.length), never past the last
 * -- the oracle's rule, which keeps the caret where the next character will go
 * instead of letting it wander into unreachable empty slots.
 */
export function activeForKey(
  key: string,
  state: InputOtpState,
  config: InputOtpConfig,
): number | null {
  const current = activeSlot(state, config);
  const last = Math.max(0, config.maxLength - 1);
  if (key === 'ArrowLeft') {
    const next = Math.max(0, current - 1);
    return next === current ? null : next;
  }
  if (key === 'ArrowRight') {
    const next = Math.min(effectiveOtpValue(state, config).length, last);
    return next === current ? null : next;
  }
  return null;
}

const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight'] as const;

const inputOtp: Slice<InputOtpConfig, InputOtpState, InputOtpActions, InputOtpPart> = {
  name: 'input-otp',
  parts: {
    // The container is not the widget -- the single <input> is. root/group are
    // layout, slot/separator are the visual mirror of the value.
    root: {},
    input: {},
    group: { optional: true },
    slot: { many: true },
    separator: { optional: true },
  },
  initialState: (config) => {
    const value = filterAndTruncate(config.value ?? config.defaultValue ?? '', config);
    return { value, activeIndex: value.length };
  },
  actions: {
    // The value arrives already filtered and truncated (the helpers own that
    // math, since a reducer gets no config). Writing the value re-seats the
    // caret at the first empty slot, which is what makes typing auto-advance.
    setValue: (_state, value) => ({ value, activeIndex: value.length }),
    setActive: (state, activeIndex) => ({ ...state, activeIndex }),
  },
  // The gate: a disabled field refuses edits AND caret movement, so a
  // controlled consumer's callback never fires for a change it would refuse.
  canDispatch: (_state, _action, config) => !config.disabled,
  aria: (state, config) => ({
    root: {
      'data-disabled': config.disabled ? 'true' : undefined,
      'data-complete': isComplete(state, config) ? 'true' : undefined,
    },
    input: {
      // The visual slots carry no accessible name of their own, so the single
      // input must announce the whole obligation: how many characters to enter.
      'aria-label': config.label ?? `Enter ${config.maxLength} character code`,
      'aria-required': config.required ? 'true' : undefined,
      'aria-disabled': config.disabled ? 'true' : undefined,
    },
  }),
  // The pure claim record (Spec 01): these keys move the active slot. Every
  // other key -- including Backspace, whose deletion the native input performs
  // and reports back through the input event -- is left to the native field.
  keymap: (event, _state, part) =>
    part === 'input' && (NAVIGATION_KEYS as ReadonlyArray<string>).includes(event.key)
      ? 'setActive'
      : null,
};

/**
 * Per-instance projection for the `slot` many-part. Slots are addressed by
 * index (their `data-value`), and their whole projection is state data the CSS
 * reads -- no ARIA, because the slots are a mirror: the accessible name, the
 * value and the focus all live on the single input, and duplicating them here
 * would announce the code twice.
 */
export function otpSlotAttrs(
  index: string,
  state: InputOtpState,
  config: InputOtpConfig,
): AriaAttrs {
  const parsed = Number(index);
  if (!Number.isInteger(parsed)) return {};
  const slot = slotState(parsed, state, config);
  return {
    'data-index': index,
    'data-active': slot.active ? 'true' : undefined,
    'data-filled': slot.filled ? 'true' : undefined,
  };
}

// First-class the slot's per-instance projection on the spec (Spec 05's open
// gap): the harness's generic `assertInstanceAriaFulfillment` reads
// `spec.instanceAria`, and `compose` does not carry it, so it is attached here.
export const inputOtpBehavior: BehaviorSpec<
  InputOtpConfig,
  InputOtpState,
  InputOtpActions,
  InputOtpPart
> = {
  ...compose('input-otp', inputOtp),
  instanceAria: (part, value, state, config) =>
    part === 'slot' ? otpSlotAttrs(value, state, config) : {},
};

export interface InputOtpInteractionOptions {
  /** The container: the click surface that focuses the field. */
  root: HTMLElement;
  /** The single real input: the keyboard, paste and value surface. */
  input: HTMLInputElement;
  getConfig: () => InputOtpConfig;
  /** Effective (controlled-aware) state at call time. */
  getState: () => InputOtpState;
  /** Commit a raw (unfiltered) value; returns the EFFECTIVE value that landed. */
  requestValue: (raw: string) => string;
  /** Commit an already-resolved active slot index. */
  requestActive: (index: number) => void;
}

/**
 * Compose the impure keyboard + paste + focus surface. Shared verbatim by
 * `bindInputOtp` (WC + Astro) and the React controller's effect -- one
 * composition, three performances, so the entry rules can never drift.
 */
export function composeInputOtpInteractions(options: InputOtpInteractionOptions): () => void {
  const { root, input, getConfig, getState, requestValue, requestActive } = options;

  /**
   * Reconcile the field to what the score accepted. This is the ONE place a
   * refused character is erased, and it has to live on the entry path rather
   * than in a state subscription: a rejected keystroke moves the DOM but NOT
   * the state, so no re-render or memory notification would ever fire to undo
   * it. Both a refused pattern character and a controlled consumer pinning the
   * value land here.
   */
  const commit = (raw: string): void => {
    const landed = requestValue(raw);
    if (input.value !== landed) input.value = landed;
  };

  // Clicking anywhere in the segmented mirror focuses the real field: the slots
  // look like inputs, so they must behave like one target.
  const onRootClick = (): void => {
    if (getConfig().disabled) return;
    input.focus();
  };
  root.addEventListener('click', onRootClick);

  // IME composition rides the input-events primitive. ONLY its composition
  // guard is used: filtering a half-composed string would delete the characters
  // the IME is still assembling, so the value path waits for compositionend.
  const inputHandler = createInputHandler({ element: input });

  // The value path stays on the plain `input` event -- deliberately NOT routed
  // through the primitive's onInput, which drops events whose `inputType` is
  // outside its editor-oriented whitelist. Every character, deletion and drop
  // must reach the filter.
  const onInput = (): void => {
    if (inputHandler.isComposing) return;
    commit(input.value);
  };
  input.addEventListener('input', onInput);

  // compositionend fires after the composed text lands in .value, so this is
  // the first safe moment to filter an IME-entered code.
  const onCompositionEnd = (): void => {
    commit(input.value);
  };
  input.addEventListener('compositionend', onCompositionEnd);

  // Paste is intercepted rather than allowed through: the native paste would
  // insert at the caret and could exceed maxLength before the filter sees it.
  // Taking the clipboard text directly makes "paste the whole code" the rule.
  const onPaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    commit(event.clipboardData?.getData('text') ?? '');
  };
  input.addEventListener('paste', onPaste);

  // Arrow navigation rides the keyboard-handler primitive; preventDefault stops
  // the native caret from moving inside the flat string, which would desync the
  // real caret from the lit slot.
  const cleanupKeyboard = createKeyboardHandler(input, {
    key: [...NAVIGATION_KEYS],
    preventDefault: true,
    handler: (event) => {
      const config = getConfig();
      if (config.disabled) return;
      const next = activeForKey(event.key, getState(), config);
      if (next === null) return;
      requestActive(next);
    },
  });

  return () => {
    root.removeEventListener('click', onRootClick);
    input.removeEventListener('input', onInput);
    input.removeEventListener('compositionend', onCompositionEnd);
    input.removeEventListener('paste', onPaste);
    inputHandler.cleanup();
    cleanupKeyboard();
  };
}

/**
 * The DOM-native binding of the input-otp score -- the client the Web Component
 * and the Astro <script> both import. React (retained-mode) reads the
 * projections declaratively instead, but composes the SAME
 * `composeInputOtpInteractions`.
 *
 * Uncontrolled: WC/Astro have no reactive prop, so `config.value` stays
 * undefined and the effective value is the intrinsic state, seeded from the
 * server-rendered input.
 */
export function bindInputOtp(root: HTMLElement): () => void {
  const input = root.querySelector<HTMLInputElement>('input[data-part="input"]');
  if (!input) return () => {};

  const parsedMax = Number.parseInt(root.dataset['maxLength'] ?? '', 10);
  const config: InputOtpConfig = {
    maxLength: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : DEFAULT_OTP_MAX_LENGTH,
    pattern: root.dataset['pattern'] ?? undefined,
    disabled: input.disabled || root.dataset['disabled'] === 'true',
    required: input.required,
    label: input.getAttribute('aria-label') ?? undefined,
    // Seed the intrinsic value from the server-rendered markup.
    defaultValue: input.value,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(inputOtpBehavior, config);

  // ids READ from the server/author markup, never generated.
  const ids = {} as PartIds<InputOtpPart>;
  for (const part of Object.keys(inputOtpBehavior.parts) as InputOtpPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let complete = isComplete(memory.get(), config);

  const render = () => {
    const state = memory.get();
    const projection = inputOtpBehavior.aria(state, config, ids);
    for (const part of ['root', 'input'] as const) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-part="slot"]')) {
      const index = el.dataset['value'];
      if (index === undefined) continue;
      applyProjection(el, otpSlotAttrs(index, state, config));
      const slot = slotState(Number(index), state, config);
      const charEl = el.querySelector<HTMLElement>('[data-otp-char]');
      if (charEl) charEl.textContent = slot.char;
      const caretEl = el.querySelector<HTMLElement>('[data-otp-caret]');
      if (caretEl) caretEl.hidden = !slot.caret;
    }

    // Value-sync: write only when the DOM and the effective value diverge, so
    // the caret survives the common typing case. This is also where a rejected
    // character is visibly reverted -- the filter refused it, so the input goes
    // back to the accepted value.
    const eff = effectiveOtpValue(state, config);
    if (input.value !== eff) input.value = eff;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const requestValue = (raw: string): string => {
    const next = filterAndTruncate(raw, config);
    const before = effectiveOtpValue(memory.get(), config);
    // Refused (disabled): the score is the truth, the caller reverts the DOM.
    if (!dispatch('setValue', config, next)) return before;
    const after = effectiveOtpValue(memory.get(), config);
    if (after !== before) {
      root.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    // The completion EDGE, not the completion state: re-typing inside a full
    // code must not re-fire, so the edge is latched.
    const nowComplete = isComplete(memory.get(), config);
    if (nowComplete && !complete) {
      root.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      root.dispatchEvent(
        new CustomEvent('rafters-otp-complete', {
          bubbles: true,
          composed: true,
          detail: { value: after },
        }),
      );
    }
    complete = nowComplete;
    return after;
  };

  const requestActive = (index: number): void => {
    dispatch('setActive', config, index);
  };

  const stopInteractions = composeInputOtpInteractions({
    root,
    input,
    getConfig: () => config,
    getState: () => memory.get(),
    requestValue,
    requestActive,
  });

  // autofocus is an author attribute the browser honours only on initial parse;
  // an upgraded custom element misses that window, so the bind re-asserts it.
  if (root.hasAttribute('data-autofocus') && !config.disabled) input.focus();

  return () => {
    unsubscribe();
    stopInteractions();
  };
}
