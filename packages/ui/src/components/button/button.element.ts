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
 * WC performance for button: the thinnest wrapper. The score AND the DOM-native
 * binding (bindButton) live in button.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button data-part="root"> so native Enter/Space activation is preserved --
 * the WC never renders a shadow tree of its own. The bind is deferred one
 * microtask because connectedCallback can fire before the light-DOM children
 * are parsed (upgrade order).
 */
import { bindButton, button } from './button.behavior';
import { buttonClasses } from './button.classes';

/**
 * Wrap each `slot="start-icon"` / `slot="end-icon"` child of the host in the
 * decorative wrapper the behavior projects aria-hidden onto, inside the root,
 * before the bind reads the parts. The light DOM has no slot assignment, so the
 * slot attribute is only the author's marker.
 */
function wrapIcons(host: HTMLElement, root: HTMLElement): void {
  const label = root.querySelector('[data-part="label"]');
  const classes = buttonClasses(
    { variant: 'default', size: 'default' },
    button.initialState({ variant: 'default', size: 'default' }),
  );
  const kinds = [
    { slot: 'start-icon', part: 'startIcon', icon: 'inline-start', className: classes.startIcon },
    { slot: 'end-icon', part: 'endIcon', icon: 'inline-end', className: classes.endIcon },
  ] as const;
  for (const kind of kinds) {
    const child = host.querySelector(`:scope > [slot="${kind.slot}"]`);
    if (!child || root.querySelector(`[data-part="${kind.part}"]`)) continue;
    const wrapper = document.createElement('span');
    wrapper.dataset['part'] = kind.part;
    wrapper.dataset['icon'] = kind.icon;
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.className = kind.className;
    child.removeAttribute('slot');
    wrapper.appendChild(child);
    if (kind.slot === 'start-icon') root.insertBefore(wrapper, label ?? root.firstChild);
    else root.appendChild(wrapper);
  }
}

export class RaftersButton extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (!root) return;
      wrapIcons(this, root);
      this.teardown = bindButton(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
