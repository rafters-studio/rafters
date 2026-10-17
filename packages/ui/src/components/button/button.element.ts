/**
 * Interactive button component for user actions
 *
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Size hierarchy: sm=tertiary actions, default=secondary interactions, lg=primary calls-to-action. Primary variant commands highest attention - use sparingly (maximum 1 per section)
 * @trust-building Destructive actions require confirmation patterns. Loading states prevent double-submission. Visual feedback reinforces user actions.
 * @accessibility WCAG AAA compliant with 44px minimum touch targets, high contrast ratios, and screen reader optimization
 * @semantic-meaning Variant mapping: default=main actions, secondary=supporting actions, destructive=irreversible actions with safety patterns
 *
 * @usage-patterns
 * DO: Primary: Main user goal, maximum 1 per section
 * DO: Secondary: Alternative paths, supporting actions
 * DO: Destructive: Permanent actions, requires confirmation patterns
 * NEVER: Multiple primary buttons competing for attention
 *
 * @example
 * ```tsx
 * // Primary action - highest attention, use once per section
 * <Button variant="default">Save Changes</Button>
 *
 * // Destructive action - requires confirmation UX
 * <Button variant="destructive">Delete Account</Button>
 *
 * // Loading state - prevents double submission
 * <Button loading>Processing...</Button>
 * ```
 */

/**
 * <rafters-button> -- the Web Component performance of the Button score: a
 * light-DOM enhancer. The author (or Astro) provides a real inner
 * `<button data-part="root">`, so native Enter/Space survive. The element
 * defers one microtask (children may not be parsed yet), wraps any child marked
 * `slot="start-icon"` / `slot="end-icon"` in the decorative icon parts, and
 * hands the inner root to `bindButton`, which reads its config once from the
 * projected markup and wires click -> press.
 */
import { bindButton, type ButtonBinding } from './button.behavior';

const ICON_SLOTS = [
  { slot: 'start-icon', part: 'startIcon', icon: 'inline-start' },
  { slot: 'end-icon', part: 'endIcon', icon: 'inline-end' },
] as const;

/** Wrap each slotted icon child in its aria-hidden part: start before the label, end after. */
function wrapIcons(root: HTMLElement): void {
  for (const { slot, part, icon } of ICON_SLOTS) {
    if (root.querySelector(`[data-part="${part}"]`)) continue;
    const child = root.querySelector(`:scope > [slot="${slot}"]`);
    if (!child) continue;
    const wrapper = document.createElement('span');
    wrapper.dataset['part'] = part;
    wrapper.dataset['icon'] = icon;
    wrapper.setAttribute('aria-hidden', 'true');
    child.removeAttribute('slot');
    wrapper.append(child);
    if (part === 'startIcon') root.prepend(wrapper);
    else root.append(wrapper);
  }
}

export class RaftersButton extends HTMLElement {
  private binding: ButtonBinding | null = null;

  connectedCallback(): void {
    // Gotcha 3 (05-authoring): connectedCallback can fire before the inner
    // button is parsed, so the bind waits one microtask.
    queueMicrotask(() => {
      if (!this.isConnected || this.binding) return;
      const root = this.querySelector<HTMLElement>('button[data-part="root"]');
      if (!root) return;
      wrapIcons(root);
      this.binding = bindButton(root);
    });
  }

  disconnectedCallback(): void {
    this.binding?.teardown();
    this.binding = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
