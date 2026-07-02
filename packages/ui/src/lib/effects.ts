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

export type EffectSpec =
  | AnnounceEffect
  | FocusTrapEffect
  | ScrollLockEffect
  | DismissOnOutsideEffect
  | RovingFocusEffect
  | HoverIntentEffect;

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
  dispatch(action: string, payload?: unknown): void;
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
        host.dispatch(effect.action);
      });
    }
    case 'roving-focus': {
      const element = host.getPart(effect.part);
      return element ? createRovingFocus(element, { orientation: effect.orientation }) : undefined;
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
