/**
 * EffectSpec vocabulary (Spec 03) and the framework-agnostic effect runner.
 *
 * Behaviors return declarative effect descriptions; they never perform
 * effects. Executors perform them against the DOM through an EffectHost.
 * The vocabulary is a CLOSED union: a component that needs an effect the
 * vocabulary cannot express is a Spec 03 change request, not a local hack.
 *
 * Two temporal kinds:
 * - one-shot (announce): edge-triggered. Fired once when the effect appears
 *   in the list; effects present in the very first apply() are baseline and
 *   are NOT fired (a component that mounts already-loading does not
 *   announce "Loading").
 * - ongoing (focus-trap, scroll-lock, dismiss-on-outside): level-triggered.
 *   Started whenever present -- including in the first apply() (a dialog
 *   that mounts open IS trapped) -- and stopped when they disappear or the
 *   runner stops.
 */
import { createFocusTrap, preventBodyScroll } from '../primitives/focus-trap';
import { onPointerDownOutside } from '../primitives/outside-click';
import { createRovingFocus } from '../primitives/roving-focus';
import { announceToScreenReader } from '../primitives/sr-announcer';

/** Announce a message via a screen-reader live region (executor: sr-announcer). */
export interface AnnounceEffect {
  type: 'announce';
  message: string;
  politeness: 'polite' | 'assertive';
}

/** Trap Tab focus inside a part; restore focus on stop (executor: focus-trap). */
export interface FocusTrapEffect {
  type: 'focus-trap';
  part: string;
}

/** Lock body scroll while present (executor: focus-trap/preventBodyScroll). */
export interface ScrollLockEffect {
  type: 'scroll-lock';
}

/** Dispatch `action` on pointerdown outside `part`. Events landing inside
 *  any of `exceptParts` are ignored -- a layer's own trigger must not both
 *  dismiss and re-activate on the same gesture. */
export interface DismissOnOutsideEffect {
  type: 'dismiss-on-outside';
  part: string;
  action: string;
  exceptParts?: string[];
}

/** Roving tabindex + arrow/Home/End focus movement across the
 *  [data-roving-item] children of a part (executor: roving-focus). Focus
 *  position is ephemeral DOM state, not behavior state. */
export interface RovingFocusEffect {
  type: 'roving-focus';
  part: string;
  orientation: 'horizontal' | 'vertical';
}

/** Pointer hover intent over a composite: entering a trigger instance
 *  dispatches `openAction` with the instance's data-value -- after `delay`
 *  when nothing is open, immediately when `immediate` (something already
 *  open, menubar-style switching). Leaving triggers/content schedules
 *  `closeAction` after `delay`; re-entering cancels it. */
export interface HoverIntentEffect {
  type: 'hover-intent';
  part: string;
  triggerPart: string;
  contentPart: string;
  delay: number;
  immediate: boolean;
  openAction: string;
  closeAction: string;
}

/** Two-dimensional roving tabindex across the [data-roving-item] children
 *  of a part arranged in a fixed-column grid (the ARIA grid pattern's
 *  keyboard contract). Left/Right move by 1, Up/Down by `columns`,
 *  Home/End to first/last. Column count comes from config -- role="grid"
 *  is type-gated to fixed columns, so no DOM measuring. */
export interface GridRovingEffect {
  type: 'grid-roving';
  part: string;
  columns: number;
}

export type EffectSpec =
  | AnnounceEffect
  | FocusTrapEffect
  | ScrollLockEffect
  | DismissOnOutsideEffect
  | RovingFocusEffect
  | HoverIntentEffect
  | GridRovingEffect;

/** One-shot (edge-triggered) effect types; everything else is ongoing. */
const ONE_SHOT: ReadonlySet<EffectSpec['type']> = new Set(['announce']);

/** Identity of an effect within the diff. Two effects with the same key are
 *  the same requested effect. */
export function effectKey(effect: EffectSpec): string {
  switch (effect.type) {
    case 'announce':
      return `announce:${effect.politeness}:${effect.message}`;
    case 'focus-trap':
      return `focus-trap:${effect.part}`;
    case 'scroll-lock':
      return 'scroll-lock';
    case 'dismiss-on-outside':
      return `dismiss-on-outside:${effect.part}:${effect.action}:${(effect.exceptParts ?? []).join(',')}`;
    case 'roving-focus':
      return `roving-focus:${effect.part}:${effect.orientation}`;
    case 'grid-roving':
      return `grid-roving:${effect.part}:${effect.columns}`;
    case 'hover-intent':
      return `hover-intent:${effect.part}:${effect.triggerPart}:${effect.contentPart}:${effect.delay}:${effect.immediate}:${effect.openAction}:${effect.closeAction}`;
  }
}

export function sameEffect(a: EffectSpec, b: EffectSpec): boolean {
  return effectKey(a) === effectKey(b);
}

export type EffectCleanup = () => void;

/** What executors need from a framework binding: resolve a declared part to
 *  its live element, and dispatch an action through the binding's
 *  accepted-dispatch-and-callback protocol. */
export interface EffectHost {
  getPart(part: string): HTMLElement | null;
  /** nativeEvent rides along for effect-initiated dispatches (outside
   *  pointerdown) so bindings can offer consumer veto callbacks BEFORE the
   *  dispatch. It never reaches the behavior. */
  dispatch(action: string, payload?: unknown, nativeEvent?: Event): void;
}

/** `document.activeElement` does not pierce shadow roots -- inside a WC's
 *  shadow tree it reports the HOST, never the focused descendant. Resolve
 *  active element relative to the queried node's own root (shadow root or
 *  document), walking into nested shadow roots the same way. A no-op for
 *  light-DOM callers (`root.getRootNode() === document`). */
function deepActiveElement(root: HTMLElement): Element | null {
  const scopeRoot = root.getRootNode() as Document | ShadowRoot;
  let active = scopeRoot.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** The default executor: maps each EffectSpec type to its primitive.
 *  Ongoing effects return their cleanup; one-shot effects return nothing. */
export function executeEffect(effect: EffectSpec, host: EffectHost): EffectCleanup | undefined {
  switch (effect.type) {
    case 'announce':
      announceToScreenReader(effect.message, effect.politeness);
      return undefined;
    case 'focus-trap': {
      const element = host.getPart(effect.part);
      return element ? createFocusTrap(element) : undefined;
    }
    case 'scroll-lock':
      return preventBodyScroll();
    case 'dismiss-on-outside': {
      const element = host.getPart(effect.part);
      if (!element) return undefined;
      return onPointerDownOutside(element, (event) => {
        const target = event.target as Node;
        for (const part of effect.exceptParts ?? []) {
          if (host.getPart(part)?.contains(target)) return;
        }
        host.dispatch(effect.action, undefined, event);
      });
    }
    case 'roving-focus': {
      const element = host.getPart(effect.part);
      return element ? createRovingFocus(element, { orientation: effect.orientation }) : undefined;
    }
    case 'grid-roving': {
      const root = host.getPart(effect.part);
      if (!root) return undefined;
      const items = () =>
        Array.from(root.querySelectorAll<HTMLElement>('[data-roving-item]')).filter(
          (item) => !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true',
        );

      const setTabStops = (current: number) => {
        for (const [index, item] of items().entries()) {
          item.setAttribute('tabindex', index === current ? '0' : '-1');
        }
      };
      setTabStops(0);

      const onKeyDown = (event: KeyboardEvent) => {
        const cells = items();
        if (cells.length === 0) return;
        const active = deepActiveElement(root) as HTMLElement | null;
        const current = active ? cells.indexOf(active) : -1;
        if (current === -1) return;

        let next: number;
        switch (event.key) {
          case 'ArrowRight':
            next = Math.min(current + 1, cells.length - 1);
            break;
          case 'ArrowLeft':
            next = Math.max(current - 1, 0);
            break;
          case 'ArrowDown':
            next = Math.min(current + effect.columns, cells.length - 1);
            break;
          case 'ArrowUp':
            next = Math.max(current - effect.columns, 0);
            break;
          case 'Home':
            next = 0;
            break;
          case 'End':
            next = cells.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        setTabStops(next);
        cells[next]?.focus();
      };

      const onFocusIn = (event: FocusEvent) => {
        const index = items().indexOf(event.target as HTMLElement);
        if (index !== -1) setTabStops(index);
      };

      root.addEventListener('keydown', onKeyDown);
      root.addEventListener('focusin', onFocusIn);
      return () => {
        root.removeEventListener('keydown', onKeyDown);
        root.removeEventListener('focusin', onFocusIn);
      };
    }
    case 'hover-intent': {
      const root = host.getPart(effect.part);
      if (!root) return undefined;
      const triggerSelector = `[data-part="${effect.triggerPart}"]`;
      const contentSelector = `[data-part="${effect.contentPart}"]`;

      let openTimer: ReturnType<typeof setTimeout> | undefined;
      let closeTimer: ReturnType<typeof setTimeout> | undefined;
      const clearOpenTimer = () => {
        if (openTimer !== undefined) {
          clearTimeout(openTimer);
          openTimer = undefined;
        }
      };
      const clearCloseTimer = () => {
        if (closeTimer !== undefined) {
          clearTimeout(closeTimer);
          closeTimer = undefined;
        }
      };

      const onPointerEnter = (event: Event) => {
        const target = event.target as HTMLElement;
        clearCloseTimer();
        if (target.closest(contentSelector)) return;
        const trigger = target.closest<HTMLElement>(`${triggerSelector}:not([disabled])`);
        const value = trigger?.dataset['value'];
        if (!value) return;
        clearOpenTimer();
        if (effect.immediate) {
          host.dispatch(effect.openAction, value);
        } else {
          openTimer = setTimeout(() => host.dispatch(effect.openAction, value), effect.delay);
        }
      };

      const onPointerLeave = (event: Event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(`${triggerSelector}, ${contentSelector}`)) return;
        clearOpenTimer();
        if (!effect.immediate) return;
        clearCloseTimer();
        closeTimer = setTimeout(() => host.dispatch(effect.closeAction), effect.delay);
      };

      root.addEventListener('pointerenter', onPointerEnter, true);
      root.addEventListener('pointerleave', onPointerLeave, true);
      return () => {
        clearOpenTimer();
        clearCloseTimer();
        root.removeEventListener('pointerenter', onPointerEnter, true);
        root.removeEventListener('pointerleave', onPointerLeave, true);
      };
    }
  }
}

export interface EffectRunner {
  /** Reconcile the live effect set against the requested list: start what
   *  appeared, stop what disappeared. Call with the CURRENT host so newly
   *  started effects capture fresh part refs and dispatch. */
  apply(effects: EffectSpec[], host: EffectHost): void;
  /** Stop every live effect. */
  stop(): void;
}

export function createEffectRunner(execute = executeEffect): EffectRunner {
  const live = new Map<string, EffectCleanup | undefined>();
  let baseline = true;

  return {
    apply(effects, host) {
      const requested = new Map(effects.map((effect) => [effectKey(effect), effect]));
      for (const [key, cleanup] of live) {
        if (!requested.has(key)) {
          cleanup?.();
          live.delete(key);
        }
      }
      for (const [key, effect] of requested) {
        if (live.has(key)) continue;
        if (baseline && ONE_SHOT.has(effect.type)) {
          live.set(key, undefined);
          continue;
        }
        live.set(key, execute(effect, host));
      }
      baseline = false;
    },
    stop() {
      for (const cleanup of live.values()) {
        cleanup?.();
      }
      live.clear();
    },
  };
}
