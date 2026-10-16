/**
 * Field -- the React performance of the field score. The shadcn Field surface:
 * a container that pairs a label with a slotted control and optional
 * helper/error text, and wires the id-association + validity ARIA the score
 * projects. React reads the projection declaratively (no bind): it clones the
 * control child to inject the id and `fieldControlAria`, renders a `<label>`
 * with the native `for` association (using the Label score's own decoration),
 * and paints the required marker + disabled dim from field.classes.ts.
 *
 * @cognitive-load 3/10 - decision 0, info 2, interaction 0, disruption 0, learning 1
 * @attention-economics Information hierarchy, not competition: label = field
 * identity, control = the action area, description = quiet guidance, error =
 * the one part that earns attention. The error's colour + `role="alert"` are
 * reserved for a real validation failure so a field at rest stays calm.
 * @trust-building Predictable labelling removes uncertainty; a description sets
 * expectations before the user acts; error messaging is specific and
 * non-punitive (it names what to fix, styled with the destructive token but
 * never shouting). A field that always names its control is the smallest unit
 * of form trust.
 * @accessibility Native label<->control association (`for`/`id`), the control's
 * `aria-describedby` composed from the rendered error + description ids (error
 * first, never dangling), `aria-invalid` while an error is shown,
 * `aria-required` while required, `disabled` propagated to the control, and
 * `role="alert"` on the error so a screen reader announces it. The required
 * marker is `aria-hidden` -- the requirement reaches AT through `aria-required`,
 * not the visual asterisk.
 * @semantic-meaning Field states: default = ready, error = validation failed
 * (description yields to the error), disabled = unavailable.
 *
 * @usage-patterns
 * DO: Always provide a label for the control.
 * DO: Use description for format hints or requirements.
 * DO: Use error with a clear, actionable message.
 * NEVER: Leave the control without an associated label.
 * NEVER: Use error styling without an error message.
 *
 * @example
 * ```tsx
 * <Field label="Email" description="We'll never share your email">
 *   <Input type="email" />
 * </Field>
 *
 * <Field label="Password" error="Password must be at least 8 characters">
 *   <Input type="password" />
 * </Field>
 * ```
 */

import { bindField } from './field.behavior';

/**
 * <rafters-field> -- the Web Component performance of the field score.
 *
 * A light-DOM enhancer: the author supplies the label / control / helper
 * markup inside the host, and the element wires it. It defers one microtask
 * (children may not have parsed) and calls `bindField(this)` unchanged, then
 * runs the returned teardown on disconnect. No shadow root, no observed
 * attributes, no events: the bind runs once, and the control owns every key.
 */
export class RaftersField extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      this.teardown = bindField(this);
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
