/**
 * Form field wrapper that composes Label, input slot, and helper text
 *
 * @cognitive-load 3/10 - Familiar form pattern with clear visual hierarchy
 * @attention-economics Information hierarchy: label=field identity, input=action area, description=guidance, error=requires attention
 * @trust-building Clear labeling reduces uncertainty, helpful descriptions guide input, non-punitive error messaging
 * @accessibility Automatic label-input association via htmlFor/id, aria-describedby for helper text, error announcements
 * @semantic-meaning Field states: default=ready, error=validation failed, disabled=unavailable
 *
 * @usage-patterns
 * DO: Always provide a label for form fields
 * DO: Use description for format hints or requirements
 * DO: Use error state with clear, actionable messages
 * DO: Generate consistent IDs for accessibility associations
 * NEVER: Leave inputs without associated labels
 * NEVER: Use error styling without error messages
 * NEVER: Stack multiple Field components without spacing
 *
 * @example
 * ```tsx
 * // Basic field with description
 * <Field label="Email" description="We'll never share your email">
 *   <Input type="email" />
 * </Field>
 *
 * // Field with error state
 * <Field label="Password" error="Password must be at least 8 characters">
 *   <Input type="password" />
 * </Field>
 *
 * // Required field
 * <Field label="Username" required>
 *   <Input />
 * </Field>
 *
 * // With custom ID
 * <Field label="Name" id="user-name">
 *   <Input />
 * </Field>
 * ```
 */

/**
 * WC performance for field: the thinnest wrapper. The score AND the DOM-native
 * client (bindField) live in field.behavior.ts, shared with the Astro
 * performance. This file only adapts that client to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM children (the label, the slotted control, the
 * helper/error) are parsed.
 *
 * Field is a LIGHT-DOM enhancer: the author (or the Astro SSR) supplies the
 * markup; the element only wires the association + ARIA onto the control.
 * The oracle's shadow render (label/description/error built from attributes)
 * and its `aria-label` mirror were a shadow-boundary workaround -- dropped here
 * because a light-DOM `for`/`id` association needs no mirror (see field.md).
 */
import { bindField } from './field.behavior';

export class RaftersField extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindField(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-field')) {
  customElements.define('rafters-field', RaftersField);
}
