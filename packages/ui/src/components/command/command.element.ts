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
 *       <Command.Item>Calendar</Command.Item>
 *       <Command.Item>Search</Command.Item>
 *     </Command.Group>
 *   </Command.List>
 * </Command>
 * ```
 */

/**
 * <rafters-command> -- the Web Component performance of the command score.
 *
 * A decorator over the command behavior that adds exactly two things: the view
 * (command.classes.ts) and the custom-element wiring. It is a light-DOM element
 * (no shadow root): bindCommand queries the root's own children and reads the
 * part ids from the markup, the same markup command.astro renders. On the next
 * microtask after connect (the light-DOM children may not have parsed yet) it
 * lays each item out with wrapCommandIcons, applies the classes where
 * command.astro applies them, then calls the same bindCommand the Astro script
 * calls. The teardown bindCommand returns runs on disconnect.
 */

import { bindCommand, command, wrapCommandIcons } from './command.behavior';
import { commandClasses } from './command.classes';

export class RaftersCommand extends HTMLElement {
  private teardown: (() => void) | null = null;
  private generation = 0;

  connectedCallback(): void {
    const generation = ++this.generation;
    queueMicrotask(() => {
      if (generation !== this.generation || !this.isConnected) return;
      this.teardown?.();
      wrapCommandIcons(this);
      this.applyClasses();
      this.teardown = bindCommand(this);
    });
  }

  disconnectedCallback(): void {
    this.generation++;
    this.teardown?.();
    this.teardown = null;
  }

  private applyClasses(): void {
    const config = {};
    const classes = commandClasses(config, command.initialState(config));
    this.setAttribute('class', classes.root);
    const set = (selector: string, className: string): void => {
      for (const el of this.querySelectorAll<Element>(selector))
        el.setAttribute('class', className);
    };
    set('[data-part="input-wrapper"]', classes.inputWrapper);
    set('[data-part="input-wrapper"] > svg', classes.inputIcon);
    set('[data-part="input"]', classes.input);
    set('[data-part="list"]', classes.list);
    set('[data-part="empty"]', classes.empty);
    set('[data-part="item"]', classes.item);
    set('[data-part="shortcut"]', classes.shortcut);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-command')) {
  customElements.define('rafters-command', RaftersCommand);
}
