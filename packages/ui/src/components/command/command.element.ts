/**
 * Command component for keyboard-driven command palettes and search interfaces
 *
 * @cognitive-load 6/10 - Command-based interface; requires learning shortcuts but fast once known
 * @attention-economics High initial attention, low ongoing: power users benefit from muscle memory
 * @trust-building Immediate search feedback, keyboard navigable, clear action consequences
 * @accessibility Full keyboard navigation, ARIA combobox pattern, screen reader announcements
 * @semantic-meaning Command execution: quick actions, navigation, search, command palettes
 *
 * @usage-patterns
 * DO: Use for power-user features and keyboard shortcuts
 * DO: Provide instant search/filter feedback
 * DO: Group related commands logically
 * DO: Support both mouse and keyboard navigation
 * DO: Show keyboard shortcut hints
 * NEVER: Use for simple forms or data entry
 * NEVER: Require mouse-only interaction
 * NEVER: Hide without clear dismissal method
 *
 * @example
 * ```tsx
 * <Command>
 *   <Command.Input placeholder="Type a command or search..." />
 *   <Command.List>
 *     <Command.Empty>No results found.</Command.Empty>
 *     <Command.Group heading="Suggestions">
 *       <Command.Item onSelect={() => {}}>Calendar</Command.Item>
 *       <Command.Item onSelect={() => {}}>Search</Command.Item>
 *     </Command.Group>
 *   </Command.List>
 * </Command>
 * ```
 */

/**
 * WC performance for command: the thinnest wrapper. The score AND the DOM-native
 * binding (bindCommand) live in command.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindCommand } from './command.behavior';

export class RaftersCommand extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCommand(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-command')) {
  customElements.define('rafters-command', RaftersCommand);
}
