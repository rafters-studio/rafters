import {
  DEFAULT_DELAY_NAMESPACE,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_PERIOD_NAMESPACE,
} from '@rafters/design-tokens/generators/defaults';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MOTION_BASELINE,
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

describe('the baseline is derived from the generator definitions', () => {
  it('takes delay values from DEFAULT_DELAY_NAMESPACE verbatim', () => {
    for (const [member, def] of Object.entries(DEFAULT_DELAY_NAMESPACE)) {
      expect(MOTION_BASELINE.delay[member]).toBe(def.value);
    }
  });

  it('takes ease values from DEFAULT_EASING_DEFINITIONS verbatim', () => {
    for (const [curve, def] of Object.entries(DEFAULT_EASING_DEFINITIONS)) {
      expect(MOTION_BASELINE.ease[curve]).toBe(def.css);
    }
  });

  it('covers all five namespaces', () => {
    expect(Object.keys(MOTION_BASELINE).sort()).toEqual([
      'delay',
      'duration',
      'ease',
      'extent',
      'period',
    ]);
  });
});

describe('resolution order', () => {
  it('falls back to the baseline when the var is declared nowhere', () => {
    const resolution = resolveMotionToken('delay', 'hover-intent', { motionPreference: 'normal' });
    expect(resolution.source).toBe('baseline');
    expect(resolution.value).toBe(DEFAULT_DELAY_NAMESPACE['hover-intent']?.value);
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
    const period = resolveMotionToken('period', 'spin', { motionPreference: 'reduced' });
    expect(period.source).not.toBe('reduced-motion');
    expect(period.value).toBe(DEFAULT_PERIOD_NAMESPACE['spin']?.value);
  });

  it('leaves ease and extent alone -- they are shaped by a duration, not zeroed', () => {
    expect(motionEase('standard', { motionPreference: 'reduced' })).toBe(
      DEFAULT_EASING_DEFINITIONS['standard']?.css,
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
    expect(motionTokenName('delay', 'skip')).toBe('rafters-delay-skip');
    expect(resolveMotionToken('delay', 'skip', { motionPreference: 'normal' }).customProperty).toBe(
      '--rafters-delay-skip',
    );
  });
});
