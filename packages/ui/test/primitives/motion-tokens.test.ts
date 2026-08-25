import { afterEach, describe, expect, it } from 'vitest';
import {
  motionDelayMs,
  motionDurationMs,
  motionEase,
  motionPeriodMs,
  motionTokenName,
  resolveMotionToken,
} from '../../src/primitives/motion-tokens';

function declare(property: string, value: string): void {
  document.documentElement.style.setProperty(property, value);
}

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('resolution order', () => {
  it('throws when the DOM is present but the token is declared nowhere', () => {
    // happy-dom provides getComputedStyle, so this is the "DOM exists, property
    // absent" case, not the true-no-environment case -- it must fail loud.
    expect(() =>
      resolveMotionToken('delay', 'hover-intent', { motionPreference: 'normal' }),
    ).toThrow(/rafters-delay-hover-intent/);
  });

  it('does not throw when getComputedStyle is unavailable, and marks the source unavailable', () => {
    const original = globalThis.getComputedStyle;
    // @ts-expect-error -- simulating an environment with no computed-style API
    globalThis.getComputedStyle = undefined;
    try {
      const resolution = resolveMotionToken('delay', 'hover-intent', {
        motionPreference: 'normal',
      });
      expect(resolution.source).toBe('unavailable');
      expect(() => motionDelayMs('hover-intent', { motionPreference: 'normal' })).not.toThrow();
    } finally {
      globalThis.getComputedStyle = original;
    }
  });

  it('prefers the computed custom property when one is declared', () => {
    declare('--rafters-delay-hover-intent', '120ms');
    const resolution = resolveMotionToken('delay', 'hover-intent', { motionPreference: 'normal' });
    expect(resolution.source).toBe('computed');
    expect(resolution.value).toBe('120ms');
    expect(motionDelayMs('hover-intent', { motionPreference: 'normal' })).toBe(120);
  });

  it('treats a declared zero as a resolved value, not as absence', () => {
    declare('--rafters-delay-hover-intent', '0ms');
    const resolution = resolveMotionToken('delay', 'hover-intent', { motionPreference: 'normal' });
    expect(resolution.source).toBe('computed');
    expect(motionDelayMs('hover-intent', { motionPreference: 'normal' })).toBe(0);
  });

  it('reads a scoped override off the element it is given', () => {
    const scoped = document.createElement('div');
    scoped.style.setProperty('--rafters-delay-linger', '450ms');
    document.body.append(scoped);
    expect(motionDelayMs('linger', { element: scoped, motionPreference: 'normal' })).toBe(450);
    scoped.remove();
  });

  it('converts seconds to milliseconds', () => {
    declare('--rafters-period-blink', '1.25s');
    expect(motionPeriodMs('blink', { motionPreference: 'normal' })).toBe(1250);
  });
});

describe('reduced motion resolves through the accessor', () => {
  it('zeroes duration and delay ahead of any computed value', () => {
    declare('--rafters-delay-hover-intent', '200ms');
    declare('--rafters-duration-moderate', '250ms');

    const delay = resolveMotionToken('delay', 'hover-intent', { motionPreference: 'reduced' });
    expect(delay.source).toBe('reduced-motion');
    expect(delay.value).toBe('0ms');
    expect(motionDelayMs('hover-intent', { motionPreference: 'reduced' })).toBe(0);
    expect(motionDurationMs('moderate', { motionPreference: 'reduced' })).toBe(0);
  });

  it('exempts period -- work loops slow, they never stop', () => {
    declare('--rafters-period-spin', '4000ms');
    const period = resolveMotionToken('period', 'spin', { motionPreference: 'reduced' });
    expect(period.source).not.toBe('reduced-motion');
    expect(period.value).toBe('4000ms');
  });

  it('leaves ease and extent alone -- they are shaped by a duration, not zeroed', () => {
    declare('--rafters-ease-standard', 'cubic-bezier(0.2, 0, 0, 1)');
    declare('--rafters-extent-pop', '1.05');
    expect(motionEase('standard', { motionPreference: 'reduced' })).toBe(
      'cubic-bezier(0.2, 0, 0, 1)',
    );
    expect(resolveMotionToken('extent', 'pop', { motionPreference: 'reduced' }).source).not.toBe(
      'reduced-motion',
    );
  });
});

describe('fail loud', () => {
  it('names the token when the member is unknown', () => {
    expect(() =>
      // Deliberately outside the member union -- the runtime guard is the subject.
      resolveMotionToken('delay', 'hover-intnt' as 'hover-intent'),
    ).toThrow(/rafters-delay-hover-intnt/);
  });

  it('lists the known members so a near-miss is fixable', () => {
    expect(() => resolveMotionToken('delay', 'hover-intnt' as 'hover-intent')).toThrow(
      /Known delay members: choreo-step, hover-intent, linger, skip, stagger-step/,
    );
  });

  it('names the namespace when the namespace is unknown', () => {
    expect(() => resolveMotionToken('duraton' as 'duration', 'fast' as never)).toThrow(
      /unknown motion namespace "duraton"/,
    );
  });

  it('throws rather than defaulting when a declared value does not parse', () => {
    declare('--rafters-delay-hover-intent', 'soon');
    expect(() =>
      resolveMotionToken('delay', 'hover-intent', { motionPreference: 'normal' }),
    ).toThrow(/rafters-delay-hover-intent" resolved to "soon"/);
  });
});

describe('token naming mirrors the generator', () => {
  it('spells the system token name', () => {
    declare('--rafters-delay-skip', '0ms');
    expect(motionTokenName('delay', 'skip')).toBe('rafters-delay-skip');
    expect(resolveMotionToken('delay', 'skip', { motionPreference: 'normal' }).customProperty).toBe(
      '--rafters-delay-skip',
    );
  });
});
