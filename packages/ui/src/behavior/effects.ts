/**
 * EffectSpec vocabulary v1 (Spec 03, minimal) and the framework-agnostic
 * effect runner.
 *
 * Behaviors return declarative effect descriptions; they never perform
 * effects. The runner subscribes to a behavior's memory, diffs consecutive
 * effect lists, and hands newly-appeared effects to an executor. The
 * vocabulary is a CLOSED union: a component that needs an effect the
 * vocabulary cannot express is a Spec 03 change request, not a local hack.
 */
import type { Memory } from '../primitives/memory';
import { announceToScreenReader } from '../primitives/sr-announcer';

/** Announce a message via a screen-reader live region (executor: sr-announcer). */
export interface AnnounceEffect {
  type: 'announce';
  message: string;
  politeness: 'polite' | 'assertive';
}

export type EffectSpec = AnnounceEffect;

export function sameEffect(a: EffectSpec, b: EffectSpec): boolean {
  return a.type === b.type && a.message === b.message && a.politeness === b.politeness;
}

/** The default executor: maps each EffectSpec type to its primitive. */
export function executeEffect(effect: EffectSpec): void {
  switch (effect.type) {
    case 'announce':
      announceToScreenReader(effect.message, effect.politeness);
      break;
  }
}

/**
 * Subscribe to a behavior instance and execute effects as they appear.
 *
 * The first subscription callback (memory fires immediately) only records
 * the baseline: effects present in the initial state are not executed.
 * Afterwards, any effect present in the new list but absent from the
 * previous one is executed exactly once per appearance.
 *
 * Returns the unsubscribe function; framework bindings own the lifecycle.
 */
export function runEffects<State>(
  instance: { memory: Memory<State>; effects(): EffectSpec[] },
  execute: (effect: EffectSpec) => void = executeEffect,
): () => void {
  let previous: EffectSpec[] | null = null;
  return instance.memory.subscribe(() => {
    const next = instance.effects();
    if (previous !== null) {
      for (const effect of next) {
        if (!previous.some((p) => sameEffect(p, effect))) {
          execute(effect);
        }
      }
    }
    previous = next;
  });
}
