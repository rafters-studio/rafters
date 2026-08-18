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
 * ```tsx
 * <Label htmlFor="message">Message</Label>
 * <Textarea id="message" placeholder="Type your message here..." />
 * ```
 */

/**
 * WC performance for textarea: the thinnest wrapper. The score AND the
 * DOM-native binding (bindTextarea) live in textarea.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM <textarea> is parsed.
 */
import { bindTextarea } from './textarea.behavior';

export class RaftersTextarea extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindTextarea(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-textarea')) {
  customElements.define('rafters-textarea', RaftersTextarea);
}
