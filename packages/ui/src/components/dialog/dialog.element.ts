/**
 * Modal dialog component with focus management and escape patterns
 *
 * @cognitive-load 6/10 - Interrupts user flow, requires decision making
 * @attention-economics Attention capture: modal=full attention, drawer=partial attention, popover=contextual attention
 * @trust-building Clear close mechanisms, confirmation for destructive actions, non-blocking for informational content
 * @accessibility Focus trapping, escape key handling, backdrop dismissal, screen reader announcements
 * @semantic-meaning Usage patterns: modal=blocking workflow, drawer=supplementary, alert=urgent information
 *
 * @usage-patterns
 * DO: Low trust - Quick confirmations, save draft (size=sm, minimal friction)
 * DO: Medium trust - Publish content, moderate consequences (clear context)
 * DO: High trust - Payments, significant impact (detailed explanation)
 * DO: Critical trust - Account deletion, permanent loss (progressive confirmation)
 * NEVER: Routine actions, non-essential interruptions
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal, Overlay, and Close button are included automatically
 * <Dialog>
 *   <DialogTrigger>Open</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *     </DialogHeader>
 *     Content here
 *   </DialogContent>
 * </Dialog>
 *
 * // Or with namespace syntax
 * <Dialog>
 *   <Dialog.Trigger asChild>
 *     <Button>Open Dialog</Button>
 *   </Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Dialog Title</Dialog.Title>
 *       <Dialog.Description>Dialog description here.</Dialog.Description>
 *     </Dialog.Header>
 *   </Dialog.Content>
 * </Dialog>
 *
 * // Hide close button if needed
 * <DialogContent showCloseButton={false}>...</DialogContent>
 * ```
 */

/**
 * <rafters-dialog> -- the Web Component performance of the dialog score.
 *
 * A decorator over the dialog behavior: it adds the view (`dialogClasses`)
 * and the custom-element lifecycle, and calls the same `bindDialog` the Astro
 * script calls. The parts stay light DOM (no shadow root) so the focus trap
 * and the outside-pointerdown dismissal can read them. Part ids are read from
 * the markup, never generated. Config comes from the `modal` and
 * `default-open` attributes, read by the bind.
 */
import { bindDialog, dialog, type DialogConfig } from './dialog.behavior';
import { dialogClasses } from './dialog.classes';

export class RaftersDialog extends HTMLElement {
  #teardown: (() => void) | null = null;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    // connectedCallback can fire before the light-DOM children parse.
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected || this.#teardown) return;
      this.#applyView();
      this.#teardown = bindDialog(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = null;
  }

  #applyView(): void {
    const config: DialogConfig = {
      modal: this.getAttribute('modal') !== 'false',
      defaultOpen: this.getAttribute('default-open') === 'true',
    };
    const classes = dialogClasses(config, dialog.initialState(config));
    const part = (name: string): HTMLElement | null =>
      this.querySelector<HTMLElement>(`[data-part="${name}"]`);
    const content = part('content');
    const container = content?.parentElement;
    const targets: ReadonlyArray<[HTMLElement | null | undefined, string]> = [
      [part('overlay'), classes.overlay],
      [container && container !== this ? container : null, classes.container],
      [content, classes.content],
      [part('title'), classes.title],
      [part('description'), classes.description],
      [part('close'), classes.close],
    ];
    for (const [el, className] of targets) {
      if (el) el.className = className;
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-dialog')) {
  customElements.define('rafters-dialog', RaftersDialog);
}
