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
