import type { AriaAttrs, KeyInput, PartIds } from '../../lib/contract';
import classy from '../../primitives/classy';
import { BehaviorElement } from '../../primitives/behavior-element';
import {
  dialog,
  isOpen,
  type DialogActions,
  type DialogConfig,
  type DialogPart,
  type DialogState,
} from './dialog.behavior';
import { dialogClasses } from './dialog.classes';

/**
 * <rafters-dialog> -- the WC performance (Spec 00 boundary 2/3: no decisions
 * here, mechanical execution over dialog.behavior.ts + dialog.classes.ts,
 * exactly like dialog.tsx). The heaviest WC case to date: modal-overlay,
 * effectful (focus-trap, scroll-lock, dismiss-on-outside all live), and the
 * first WC performance with a REACHABLE action (trigger/Escape/close-button
 * all dispatch).
 *
 * LIGHT DOM, not shadow DOM, for every part the effects runner touches --
 * the same departure navigation-menu's WC port needed and for the same
 * reason: `dismiss-on-outside` listens on `document` and reads
 * `event.target`, which RETARGETS to the shadow HOST for anything rendered
 * inside a shadow root (making every click inside the shadow tree
 * indistinguishable from a click on it), and focus-trap.ts reads
 * `document.activeElement` directly, which reports the HOST rather than the
 * focused descendant once focus is inside a shadow tree. dialog.tsx's own
 * parts are light DOM already (a real `createPortal` to `document.body`);
 * building them inside THIS element's shadow root would be the one
 * structural choice that breaks the effectful proof this port exists to
 * make. So the shadow root here carries nothing but a one-time passthrough
 * `<slot>` (required simply so the host's own light-DOM children render at
 * all once a shadow root exists) -- `buildParts()` is unused, `update()` is
 * overridden wholesale, same shape as navigation-menu.element.ts.
 *
 * Consumer markup carries `data-part` the way navigation-menu's does:
 *
 * ```html
 * <rafters-dialog>
 *   <button data-part="trigger">Open settings</button>
 *   <div data-part="content">
 *     <h2 data-part="title">Settings</h2>
 *     <p data-part="description">Adjust your preferences.</p>
 *     <button type="button">Save</button>
 *   </div>
 * </rafters-dialog>
 * ```
 *
 * `content` is discovered, never built -- what IS built (mechanically, over
 * dialog.classes.ts, exactly mirroring dialog.tsx's own DialogContent/
 * DialogOverlay defaults) is the overlay, the close button, and the
 * fixed-position wrapper `content` sits inside while open: dialog.tsx does
 * not make consumers hand-author those either, and dialog.classes.ts
 * already assumes their existence (`overlay`/`container`/`close` are
 * distinct class strings with no home in a mere `content` merge). All three
 * are built and torn down idempotently -- a re-run of `update()` while
 * still open reuses the already-mounted nodes rather than replacing them,
 * so an ongoing effect bound to `content` (focus-trap, dismiss-on-outside)
 * never orphans against a swapped root. That idempotence, not part-level
 * diffing, is this port's answer to the "known limitation" documented on
 * BehaviorElement.update(): a light-DOM performance that never rebuilds an
 * already-open part has nothing for that limitation to bite.
 *
 * No portal to `document.body` (dialog.tsx's `createPortal` target): content
 * mounts as a light-DOM child of the host itself, `position: fixed` doing
 * the same viewport-escape a portal buys, without the mount/unmount-on-open
 * lifecycle a real reparent would add. Latitude, not parity debt -- the
 * score says nothing about portaling. Presence/exit animation, the explicit
 * `<DialogPortal>`/`<DialogOverlay>` composition, `forceMount`, the
 * `container` prop, and the onEscapeKeyDown/onPointerDownOutside veto
 * callbacks are React-only ergonomics with no WC counterpart attempted here
 * (no prop channel to veto through) -- out of scope for this port, not
 * dropped silently (see the conformance suite's react-only block and the
 * commit message).
 */

const CLOSE_SVG_NS = 'http://www.w3.org/2000/svg';

function parseModal(value: string | null): boolean | undefined {
  return value === null ? undefined : value !== 'false';
}

function parseOpen(hasAttr: boolean, value: string | null): boolean | undefined {
  return hasAttr ? value !== 'false' : undefined;
}

/** Translate a native KeyboardEvent into the contract's KeyInput -- the WC
 *  counterpart to use-behavior.ts's `keyInputOf`. */
function keyInputOf(event: KeyboardEvent): KeyInput {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

export class RaftersDialog extends BehaviorElement<
  DialogConfig,
  DialogState,
  DialogActions,
  DialogPart
> {
  static observedAttributes = ['open', 'default-open', 'modal'];

  protected override readonly spec = dialog;

  private slotted = false;
  private eventsWired = false;
  /** Cached once discovered -- the DOM presence model below genuinely
   *  DETACHES content on close (matching dialog.tsx's default unmount, not
   *  a `hidden` stand-in: an empty `fixed inset-0` wrapper left mounted
   *  would still capture pointer events over the whole viewport). Once
   *  detached, `this.querySelector` can no longer find it, so the
   *  reference is captured on first discovery and reused for the life of
   *  the instance. */
  private contentRef: HTMLElement | null = null;

  protected override readConfig(): DialogConfig {
    return {
      open: parseOpen(this.hasAttribute('open'), this.getAttribute('open')),
      defaultOpen: this.hasAttribute('default-open'),
      modal: parseModal(this.getAttribute('modal')),
    };
  }

  /** Unused -- this performance renders into light DOM, not the shadow
   *  root (see the class doc). Required by the adapter's abstract
   *  contract; `update()` below is overridden wholesale instead. */
  protected override buildParts(): Node {
    return document.createDocumentFragment();
  }

  override update(): void {
    this.ensureSlot();
    this.wireEvents();
    this.contentRef ??= this.querySelector<HTMLElement>('[data-part="content"]');

    const config = this.readConfig();
    const state = this.currentState(config);
    const open = isOpen(state, config);
    const content = this.contentRef;

    if (content) {
      if (open) this.mountContent(content, config, state);
      else this.unmountContent(content);
    }

    this.applyParts(content, open, state, config);
    this.runEffects(this.spec.effects(state, config));
  }

  /** One-time passthrough slot: the only shadow-root content this
   *  performance ever has. Without it the host's light-DOM children --
   *  trigger, content, and everything this class builds alongside them --
   *  would not render at all (see the class doc: nothing effect-observed
   *  lives in shadow DOM here). */
  private ensureSlot(): void {
    if (this.slotted || !this.shadowRoot) return;
    this.shadowRoot.appendChild(document.createElement('slot'));
    this.slotted = true;
  }

  /** Click/keydown delegation, wired once. Native `<button>` triggers
   *  convert Enter/Space to click (Spec 01 rule 5), so click covers
   *  trigger and close; keydown carries the keymap's Escape contract,
   *  never a hand-decided key check. */
  private wireEvents(): void {
    if (this.eventsWired) return;
    this.eventsWired = true;

    this.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const config = this.readConfig();
      const state = this.currentState(config);

      if (target.closest('[data-part="trigger"]')) {
        this.request(isOpen(state, config) ? 'close' : 'open');
        return;
      }
      if (target.closest('[data-part="close"]')) {
        this.request('close');
      }
    });

    this.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (!target.closest('[data-part="content"]')) return;
      const config = this.readConfig();
      const state = this.currentState(config);
      const action = this.spec.keymap(keyInputOf(event), state, 'content', config);
      if (!action) return;
      event.preventDefault();
      this.request(action);
    });
  }

  /**
   * Ensure the open-state structure -- overlay (modal only) and the
   * fixed-position wrapper `content` sits inside -- is IN THE DOM, WITHOUT
   * recreating anything already there. Idempotent by construction: a
   * second call while still open finds `content.parentElement` already
   * carrying `data-dialog-container` and does nothing structural, so an
   * effect bound to `content` on a prior call (focus-trap,
   * dismiss-on-outside) is never left pointed at a detached node.
   */
  private mountContent(content: HTMLElement, config: DialogConfig, state: DialogState): void {
    const classes = dialogClasses(config, state);
    let container = content.parentElement;
    if (!container || !container.hasAttribute('data-dialog-container')) {
      container = document.createElement('div');
      container.setAttribute('data-dialog-container', '');
      container.className = classes.container;
      container.appendChild(content);
    }
    if (!container.isConnected) this.appendChild(container);

    if (config.modal === false) {
      this.querySelector<HTMLElement>('[data-part="overlay"]')?.remove();
    } else if (!this.querySelector('[data-part="overlay"]')) {
      const overlay = document.createElement('div');
      overlay.setAttribute('data-part', 'overlay');
      overlay.className = classes.overlay;
      this.insertBefore(overlay, container);
    }

    if (!content.querySelector('[data-part="close"]')) {
      content.appendChild(this.buildCloseButton(classes.close, classes.closeIcon));
    }

    content.tabIndex = -1;
  }

  /** Tear down the open-state structure this element built: the overlay
   *  and the positioning wrapper -- taking `content` (still nested inside
   *  it) out of the document WITH it, matching dialog.tsx's default
   *  unmount-on-close (not a `hidden` stand-in: an empty `fixed inset-0`
   *  wrapper left mounted would still capture pointer events over the
   *  whole viewport). `contentRef` keeps the detached node reachable for
   *  the next open. The close button travels with it -- nothing to
   *  recreate on reopen. */
  private unmountContent(content: HTMLElement): void {
    this.querySelector<HTMLElement>('[data-part="overlay"]')?.remove();
    const container = content.parentElement;
    if (container?.hasAttribute('data-dialog-container')) {
      container.remove();
    } else {
      content.remove();
    }
  }

  private buildCloseButton(buttonClass: string, iconClass: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-part', 'close');
    button.className = buttonClass;

    const svg = document.createElementNS(CLOSE_SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', iconClass);

    const pathOne = document.createElementNS(CLOSE_SVG_NS, 'path');
    pathOne.setAttribute('d', 'M18 6 6 18');
    const pathTwo = document.createElementNS(CLOSE_SVG_NS, 'path');
    pathTwo.setAttribute('d', 'm6 6 12 12');
    svg.append(pathOne, pathTwo);
    button.appendChild(svg);

    return button;
  }

  /** Aria/classes application over consumer-authored (trigger, content,
   *  title, description) and this-class-built (overlay, close) light-DOM
   *  parts. Ids are presence-aware: an optional part not currently in the
   *  DOM reads '' here, so `dialog.aria`'s `ids.title || undefined` (and
   *  friends) correctly projects absence rather than a dangling reference
   *  -- the WC counterpart to useBehavior's `presentParts` tracking. */
  private applyParts(
    content: HTMLElement | null,
    open: boolean,
    state: DialogState,
    config: DialogConfig,
  ): void {
    const trigger = this.querySelector<HTMLElement>('[data-part="trigger"]');
    const title = open ? content?.querySelector<HTMLElement>('[data-part="title"]') : null;
    const description = open
      ? content?.querySelector<HTMLElement>('[data-part="description"]')
      : null;
    const overlay = open ? this.querySelector<HTMLElement>('[data-part="overlay"]') : null;
    const close = open ? content?.querySelector<HTMLElement>('[data-part="close"]') : null;

    const base = this.partIds();
    const ids: PartIds<DialogPart> = {
      trigger: base.trigger,
      content: open && content ? base.content : '',
      overlay: overlay ? base.overlay : '',
      title: title ? base.title : '',
      description: description ? base.description : '',
      close: close ? base.close : '',
    };

    const projection = this.spec.aria(state, config, ids);
    const classes = dialogClasses(config, state);

    if (trigger) {
      if (!trigger.id) trigger.id = ids.trigger;
      this.applyAttrs(trigger, projection.trigger ?? {});
    }

    if (open && content) {
      if (!content.id) content.id = ids.content;
      this.applyAttrs(content, projection.content ?? {});
      content.className = classy(classes.content, content.className);
    }

    if (title) {
      if (!title.id) title.id = ids.title;
      this.applyAttrs(title, projection.title ?? {});
      title.className = classy(classes.title, title.className);
    }
    if (description) {
      if (!description.id) description.id = ids.description;
      this.applyAttrs(description, projection.description ?? {});
      description.className = classy(classes.description, description.className);
    }
    if (overlay) {
      if (!overlay.id) overlay.id = ids.overlay;
      this.applyAttrs(overlay, projection.overlay ?? {});
    }
    if (close) {
      if (!close.id) close.id = ids.close;
      this.applyAttrs(close, projection.close ?? {});
    }
  }

  private applyAttrs(element: HTMLElement, attrs: AriaAttrs): void {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  }
}

if (!customElements.get('rafters-dialog')) {
  customElements.define('rafters-dialog', RaftersDialog);
}

export default RaftersDialog;
