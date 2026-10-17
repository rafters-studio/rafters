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
 * ```html
 * <rafters-textarea name="message" aria-label="Message" placeholder="Type your message here..."></rafters-textarea>
 * ```
 */

/**
 * <rafters-textarea> -- the Web Component performance of the textarea score.
 *
 * Light DOM, no shadow root: the native <textarea> is the form-associated
 * control and the submission path, so it must live in the document's form
 * tree. The element renders that one field from the host's attributes (value
 * is the seed, held as the field's child text), then hands the host to
 * bindTextarea -- the same DOM-native controller Astro uses. The bind runs on
 * the microtask after connect so light-DOM children (a consumer-rendered
 * [data-part="error"]) have parsed, and its teardown runs on disconnect.
 */
import { bindTextarea, textareaBehavior, type TextareaConfig } from './textarea.behavior';
import { textareaClassSet } from './textarea.classes';

export class RaftersTextarea extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      this.#teardown?.();
      this.#teardown = null;
      this.#ensureField();
      this.#teardown = bindTextarea(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
  }

  #ensureField(): void {
    if (this.querySelector('[data-part="textarea"]')) return;

    const config: TextareaConfig = {
      disabled: this.hasAttribute('disabled'),
      readonly: this.hasAttribute('readonly'),
      required: this.hasAttribute('required'),
      invalid: this.hasAttribute('invalid'),
    };
    const state = textareaBehavior.initialState(config);

    const field = document.createElement('textarea');
    field.setAttribute('data-part', 'textarea');
    field.className = textareaClassSet(config, state).textarea;
    field.disabled = config.disabled === true;
    field.readOnly = config.readonly === true;
    // bindTextarea reads required from the field's aria-required, never from
    // the host, and the native attribute stays off so the score owns the AT signal.
    if (config.required) field.setAttribute('aria-required', 'true');
    for (const name of ['name', 'placeholder', 'rows', 'aria-label']) {
      const value = this.getAttribute(name);
      if (value !== null) field.setAttribute(name, value);
    }
    // A <textarea> holds its initial value as child text, not a value attribute.
    field.textContent = this.getAttribute('value') ?? '';

    this.prepend(field);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-textarea')) {
  customElements.define('rafters-textarea', RaftersTextarea);
}
