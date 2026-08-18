/**
 * Form input component with validation states and accessibility
 *
 * @cognitive-load 4/10 - Data entry with validation feedback requires user attention
 * @attention-economics State hierarchy: default=ready, focus=active input, error=requires attention, success=validation passed
 * @trust-building Clear validation feedback, error recovery patterns, progressive enhancement
 * @accessibility Screen reader labels, validation announcements, keyboard navigation, high contrast support
 * @semantic-meaning Type-appropriate validation: email=format validation, password=security indicators, number=range constraints
 *
 * @usage-patterns
 * DO: Always pair with descriptive Label component
 * DO: Use helpful placeholders showing format examples
 * DO: Provide real-time validation for user confidence
 * DO: Use appropriate input types for sensitive data
 * NEVER: Label-less inputs, validation only on submit, unclear error messages
 *
 * @example
 * ```tsx
 * // Basic input with label
 * <Label htmlFor="email">Email</Label>
 * <Input id="email" type="email" placeholder="you@example.com" />
 *
 * // Error state
 * <Input variant="error" placeholder="Invalid input" />
 *
 * // Success state
 * <Input variant="success" defaultValue="Valid input" />
 *
 * // Sizes
 * <Input size="sm" placeholder="Small" />
 * <Input size="lg" placeholder="Large" />
 * ```
 */

/**
 * WC performance for input: the thinnest wrapper. The score AND the DOM-native
 * binding (bindInput) live in input.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM <input> is parsed.
 */
import { bindInput } from './input.behavior';

export class RaftersInput extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindInput(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-input')) {
  customElements.define('rafters-input', RaftersInput);
}
