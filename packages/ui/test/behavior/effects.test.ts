import { describe, expect, it, vi } from 'vitest';
import {
  createEffectRunner,
  effectKey,
  sameEffect,
  type EffectCleanup,
  type EffectHost,
  type EffectSpec,
} from '../../src/lib/effects';

const noopHost: EffectHost = {
  getPart: () => null,
  dispatch: () => {},
};

const announce: EffectSpec = { type: 'announce', message: 'Loading', politeness: 'polite' };
const trap: EffectSpec = { type: 'focus-trap', part: 'content' };
const lock: EffectSpec = { type: 'scroll-lock' };

describe('createEffectRunner', () => {
  it('does not fire one-shot effects present in the first apply (baseline)', () => {
    const execute = vi.fn();
    const runner = createEffectRunner(execute);
    runner.apply([announce], noopHost);
    expect(execute).not.toHaveBeenCalled();
    runner.stop();
  });

  it('starts ongoing effects even in the first apply', () => {
    const cleanup = vi.fn();
    const execute = vi.fn((): EffectCleanup => cleanup);
    const runner = createEffectRunner(execute);
    runner.apply([trap], noopHost);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(trap, noopHost);
    runner.stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('fires a one-shot effect exactly once when it appears', () => {
    const execute = vi.fn();
    const runner = createEffectRunner(execute);
    runner.apply([], noopHost);
    runner.apply([announce], noopHost);
    runner.apply([announce], noopHost);
    expect(execute).toHaveBeenCalledTimes(1);
    runner.stop();
  });

  it('re-fires an effect that disappears and reappears', () => {
    const execute = vi.fn();
    const runner = createEffectRunner(execute);
    runner.apply([], noopHost);
    runner.apply([announce], noopHost);
    runner.apply([], noopHost);
    runner.apply([announce], noopHost);
    expect(execute).toHaveBeenCalledTimes(2);
    runner.stop();
  });

  it('stops an ongoing effect when it leaves the list', () => {
    const cleanup = vi.fn();
    const execute = vi.fn((): EffectCleanup => cleanup);
    const runner = createEffectRunner(execute);
    runner.apply([trap, lock], noopHost);
    expect(execute).toHaveBeenCalledTimes(2);
    runner.apply([lock], noopHost);
    expect(cleanup).toHaveBeenCalledTimes(1);
    runner.apply([], noopHost);
    expect(cleanup).toHaveBeenCalledTimes(2);
    runner.stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('stop() cleans up every live effect', () => {
    const cleanup = vi.fn();
    const execute = vi.fn((): EffectCleanup => cleanup);
    const runner = createEffectRunner(execute);
    runner.apply([trap, lock], noopHost);
    runner.stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('does not restart a persisting effect across applies', () => {
    const execute = vi.fn(() => vi.fn());
    const runner = createEffectRunner(execute);
    runner.apply([trap], noopHost);
    runner.apply([trap], noopHost);
    runner.apply([trap], noopHost);
    expect(execute).toHaveBeenCalledTimes(1);
    runner.stop();
  });

  it('starts new effects with the host passed to the CURRENT apply', () => {
    const seenHosts: EffectHost[] = [];
    const execute = vi.fn((_effect: EffectSpec, host: EffectHost) => {
      seenHosts.push(host);
      return undefined;
    });
    const runner = createEffectRunner(execute);
    const laterHost: EffectHost = { getPart: () => null, dispatch: () => {} };
    runner.apply([trap], noopHost);
    runner.apply([trap, lock], laterHost);
    expect(seenHosts).toEqual([noopHost, laterHost]);
    runner.stop();
  });
});

describe('effect identity', () => {
  it('sameEffect compares by every discriminating field', () => {
    expect(sameEffect(announce, { ...announce })).toBe(true);
    expect(sameEffect(announce, { ...announce, message: 'y' })).toBe(false);
    expect(sameEffect(announce, { ...announce, politeness: 'assertive' })).toBe(false);
    expect(sameEffect(trap, { type: 'focus-trap', part: 'other' })).toBe(false);
  });

  it('dismiss-on-outside identity includes part, action, and exceptions', () => {
    const dismiss: EffectSpec = {
      type: 'dismiss-on-outside',
      part: 'content',
      action: 'close',
      exceptParts: ['trigger'],
    };
    expect(effectKey(dismiss)).not.toBe(
      effectKey({ type: 'dismiss-on-outside', part: 'content', action: 'close' }),
    );
    expect(sameEffect(dismiss, { ...dismiss })).toBe(true);
  });
});
