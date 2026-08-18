/**
 * Combobox component for searchable selection with typeahead filtering
 *
 * @cognitive-load 6/10 - Combines input + dropdown; requires typing and visual scanning
 * @attention-economics Medium-high attention: keyboard input, list scanning, selection confirmation
 * @trust-building Immediate filtering feedback, clear match highlighting, keyboard accessible
 * @accessibility Full ARIA combobox pattern, listbox role, option roles, live region announcements
 * @semantic-meaning Filtered selection: choosing from large datasets, typeahead search
 *
 * @usage-patterns
 * DO: Use for selection from large option sets (>10 items)
 * DO: Provide clear empty state and no-results messaging
 * DO: Support both mouse and keyboard selection
 * DO: Highlight matching text in filtered results
 * DO: Allow clearing the selection
 * NEVER: Use for small option sets (<5 items) - use Select instead
 * NEVER: Require exact match when approximate would help
 * NEVER: Hide the clear button when a selection exists
 *
 * @example
 * ```tsx
 * <Combobox value={value} onValueChange={setValue}>
 *   <Combobox.Input placeholder="Select framework..." />
 *   <Combobox.Content>
 *     <Combobox.Empty>No framework found.</Combobox.Empty>
 *     <Combobox.Group>
 *       <Combobox.Item value="react">React</Combobox.Item>
 *       <Combobox.Item value="vue">Vue</Combobox.Item>
 *       <Combobox.Item value="angular">Angular</Combobox.Item>
 *     </Combobox.Group>
 *   </Combobox.Content>
 * </Combobox>
 * ```
 */

/**
 * WC performance for combobox: the thinnest wrapper. The score AND the
 * DOM-native binding (bindCombobox) live in combobox.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 */
import { bindCombobox } from './combobox.behavior';

export class RaftersCombobox extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCombobox(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-combobox')) {
  customElements.define('rafters-combobox', RaftersCombobox);
}
