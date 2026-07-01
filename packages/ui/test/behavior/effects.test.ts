import { describe, expect, it, vi } from 'vitest';
import { createMemory } from '../../src/primitives/memory';
import { runEffects, sameEffect, type EffectSpec } from '../../src/behavior/effects';

interface State {
  loading: boolean;
}

function instanceFor(initial: State) {
  const memory = createMemory<State>(() => initial);
  return {
    memory,
    effects: (): EffectSpec[] =>
      memory.get().loading ? [{ type: 'announce', message: 'Loading', politeness: 'polite' }] : [],
  };
}

describe('runEffects', () => {
  it('does not execute effects present in the initial state (baseline)', () => {
    const instance = instanceFor({ loading: true });
    const execute = vi.fn();
    const stop = runEffects(instance, execute);
    expect(execute).not.toHaveBeenCalled();
    stop();
  });

  it('executes an effect exactly once when it appears', () => {
    const instance = instanceFor({ loading: false });
    const execute = vi.fn();
    const stop = runEffects(instance, execute);
    instance.memory.set({ loading: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      type: 'announce',
      message: 'Loading',
      politeness: 'polite',
    });
    stop();
  });

  it('does not re-execute an effect that persists across state changes', () => {
    const memory = createMemory<{ loading: boolean; other: number }>(() => ({
      loading: false,
      other: 0,
    }));
    const instance = {
      memory,
      effects: (): EffectSpec[] =>
        memory.get().loading
          ? [{ type: 'announce', message: 'Loading', politeness: 'polite' }]
          : [],
    };
    const execute = vi.fn();
    const stop = runEffects(instance, execute);
    memory.set({ loading: true, other: 0 });
    memory.set({ loading: true, other: 1 });
    memory.set({ loading: true, other: 2 });
    expect(execute).toHaveBeenCalledTimes(1);
    stop();
  });

  it('re-executes an effect that disappears and reappears', () => {
    const instance = instanceFor({ loading: false });
    const execute = vi.fn();
    const stop = runEffects(instance, execute);
    instance.memory.set({ loading: true });
    instance.memory.set({ loading: false });
    instance.memory.set({ loading: true });
    expect(execute).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops executing after unsubscribe', () => {
    const instance = instanceFor({ loading: false });
    const execute = vi.fn();
    const stop = runEffects(instance, execute);
    stop();
    instance.memory.set({ loading: true });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('sameEffect', () => {
  it('compares by every field', () => {
    const a: EffectSpec = { type: 'announce', message: 'x', politeness: 'polite' };
    expect(sameEffect(a, { ...a })).toBe(true);
    expect(sameEffect(a, { ...a, message: 'y' })).toBe(false);
    expect(sameEffect(a, { ...a, politeness: 'assertive' })).toBe(false);
  });
});
