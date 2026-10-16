/**
 * InputOTP component for one-time password and verification code input
 *
 * @cognitive-load 4/10 - Single-purpose input; segmented display aids focus
 * @attention-economics Medium attention: focused on accurate character entry
 * @trust-building Clear slot indicators, auto-advance between slots, paste support
 * @accessibility Single input with ARIA live for progress, visible focus state
 * @semantic-meaning Security verification: 2FA, email confirmation, phone verification
 *
 * @usage-patterns
 * DO: Use for verification codes (2FA, email, SMS)
 * DO: Support paste for full code
 * DO: Auto-advance cursor between slots
 * DO: Show clear visual feedback for filled vs empty slots
 * DO: Allow backspace to navigate and clear
 * NEVER: Use for regular text input
 * NEVER: Hide the input visually from screen readers
 * NEVER: Require manual tab between slots
 *
 * @example
 * ```tsx
 * <InputOTP maxLength={6} value={otp} onChange={setOtp}>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={0} />
 *     <InputOTP.Slot index={1} />
 *     <InputOTP.Slot index={2} />
 *   </InputOTP.Group>
 *   <InputOTP.Separator />
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={3} />
 *     <InputOTP.Slot index={4} />
 *     <InputOTP.Slot index={5} />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 */

/**
 * Web Component performance of the input-otp score. Light DOM throughout: the
 * host renders the root part, the one native `<input data-part="input">` as the
 * root's first child, and moves the author's children (the group, slot and
 * separator sub-components below) into the root. On the microtask after
 * connect it hands the root to `bindInputOtp`, unchanged, and runs the
 * returned teardown on disconnect. Editing, IME, paste, arrows and completion
 * events are the bind's; the native input is the form submission path, so no
 * hidden mirror exists.
 *
 * Attributes on `<rafters-input-otp>`, named as the React InputOTPProps:
 * maxLength, pattern, defaultValue, disabled, autoFocus, required, name,
 * aria-label. Sub-components: `<rafters-input-otp-group>`,
 * `<rafters-input-otp-slot index="N">`, `<rafters-input-otp-separator>`.
 */

import {
  bindInputOtp,
  DEFAULT_OTP_MAX_LENGTH,
  inputOtpBehavior,
  otpSlotAttrs,
  slotState,
  type InputOtpConfig,
  type InputOtpPart,
} from './input-otp.behavior';
import { inputOtpClassSet } from './input-otp.classes';
import type { AriaAttrs, PartIds } from '../../lib/contract';

const HOST_TAG = 'rafters-input-otp';

const NO_IDS: PartIds<InputOtpPart> = { root: '', input: '', group: '', slot: '', separator: '' };

/** Write a resolved projection raw: undefined removes the attribute. */
function applyAttrs(el: HTMLElement, attrs: AriaAttrs | undefined): void {
  if (!attrs) return;
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
}

function boolAttr(el: Element, name: string): boolean {
  const value = el.getAttribute(name);
  return value !== null && value !== 'false';
}

/** Config from a host's attributes; a bad maxLength falls back, nothing throws. */
function readConfig(host: Element | null): InputOtpConfig {
  if (!host) return { maxLength: DEFAULT_OTP_MAX_LENGTH };
  const parsed = Number.parseInt(host.getAttribute('maxLength') ?? '', 10);
  return {
    maxLength: Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OTP_MAX_LENGTH,
    pattern: host.getAttribute('pattern') ?? undefined,
    defaultValue: host.getAttribute('defaultValue') ?? undefined,
    disabled: boolAttr(host, 'disabled'),
    required: boolAttr(host, 'required'),
    label: host.getAttribute('aria-label') ?? undefined,
  };
}

export class RaftersInputOtp extends HTMLElement {
  #teardown: (() => void) | null = null;
  #connected = false;

  connectedCallback(): void {
    this.#connected = true;
    // Gotcha 3 (05-authoring.md): light-DOM children may not be parsed yet.
    queueMicrotask(() => {
      if (!this.#connected || this.#teardown) return;
      const root = this.#render();
      this.#teardown = bindInputOtp(root);
    });
  }

  disconnectedCallback(): void {
    this.#connected = false;
    this.#teardown?.();
    this.#teardown = null;
  }

  /** Build (once) the root part and its input; return the root. */
  #render(): HTMLElement {
    this.style.display = 'contents';
    const config = readConfig(this);
    const state = inputOtpBehavior.initialState(config);
    const classes = inputOtpClassSet(config, state);
    const aria = inputOtpBehavior.aria(state, config, NO_IDS);

    let root = this.querySelector<HTMLElement>(':scope > [data-part="root"]');
    if (!root) {
      root = document.createElement('div');
      root.setAttribute('data-part', 'root');
      root.append(...Array.from(this.childNodes));
      this.append(root);
    }
    root.setAttribute('data-max-length', String(config.maxLength));
    if (config.pattern !== undefined) root.setAttribute('data-pattern', config.pattern);
    if (this.hasAttribute('autoFocus')) root.setAttribute('data-autofocus', '');
    root.className = classes.root;
    applyAttrs(root, aria.root);

    let input = root.querySelector<HTMLInputElement>(':scope > input[data-part="input"]');
    if (!input) {
      input = document.createElement('input');
      input.setAttribute('data-part', 'input');
      input.type = 'text';
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('autocomplete', 'one-time-code');
      input.value = config.defaultValue ?? '';
      root.prepend(input);
    }
    const name = this.getAttribute('name');
    if (name !== null) input.name = name;
    input.maxLength = config.maxLength;
    input.required = config.required === true;
    input.disabled = config.disabled === true;
    input.className = classes.input;
    applyAttrs(input, aria.input);
    return root;
  }
}

/** Shared by the sub-components: the config of the host they sit in. */
function hostConfig(el: HTMLElement): InputOtpConfig {
  return readConfig(el.closest(HOST_TAG));
}

export class RaftersInputOtpGroup extends HTMLElement {
  connectedCallback(): void {
    const config = hostConfig(this);
    this.setAttribute('data-part', 'group');
    this.className = inputOtpClassSet(config, inputOtpBehavior.initialState(config)).group;
  }
}

export class RaftersInputOtpSlot extends HTMLElement {
  connectedCallback(): void {
    const config = hostConfig(this);
    const state = inputOtpBehavior.initialState(config);
    const classes = inputOtpClassSet(config, state);
    const index = this.getAttribute('index') ?? '';
    const slot = slotState(Number(index), state, config);
    this.setAttribute('data-part', 'slot');
    this.setAttribute('data-value', index);
    this.className = classes.slot;
    applyAttrs(this, otpSlotAttrs(index, state, config));

    let char = this.querySelector<HTMLElement>(':scope > [data-otp-char]');
    if (!char) {
      char = document.createElement('span');
      char.setAttribute('data-otp-char', '');
      char.textContent = slot.char;
    }
    char.className = classes.char;

    let caret = this.querySelector<HTMLElement>(':scope > [data-otp-caret]');
    if (!caret) {
      caret = document.createElement('span');
      caret.setAttribute('data-otp-caret', '');
      caret.setAttribute('aria-hidden', 'true');
      caret.hidden = !slot.caret;
      caret.append(document.createElement('span'));
    }
    caret.className = classes.caret;
    const bar = caret.firstElementChild;
    if (bar) bar.className = classes.caretBar;

    this.replaceChildren(char, caret);
  }
}

export class RaftersInputOtpSeparator extends HTMLElement {
  connectedCallback(): void {
    const config = hostConfig(this);
    this.setAttribute('data-part', 'separator');
    this.setAttribute('aria-hidden', 'true');
    this.className = inputOtpClassSet(config, inputOtpBehavior.initialState(config)).separator;
    if (this.childNodes.length === 0) this.textContent = '-';
  }
}

if (typeof customElements !== 'undefined') {
  const defs: ReadonlyArray<[string, CustomElementConstructor]> = [
    [HOST_TAG, RaftersInputOtp],
    ['rafters-input-otp-group', RaftersInputOtpGroup],
    ['rafters-input-otp-slot', RaftersInputOtpSlot],
    ['rafters-input-otp-separator', RaftersInputOtpSeparator],
  ];
  for (const [tag, ctor] of defs) {
    if (!customElements.get(tag)) customElements.define(tag, ctor);
  }
}
