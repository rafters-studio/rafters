/**
 * Fill resolver tests (v2, #1637) -- the fill SIGNATURE.
 *
 * word | word/alpha | word-to-word, expanding to existing Tailwind
 * utilities. The dark contract is proven by which utility is emitted:
 * semantic words compile to utilities over flipping vars (bg-primary
 * follows .dark), family words to literal scale utilities (never flip).
 *
 * The parity block keeps this dependency-free copy in lockstep with the
 * canonical implementation in @rafters/shared.
 */

import {
  expandFillSignature,
  parseFillSignature,
  type FillContext as SharedFillContext,
} from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { resolveFillName } from '../../src/primitives/fill-resolver';

describe('resolveFillName -- solid signatures', () => {
  it('semantic role word pairs its foreground on surfaces', () => {
    expect(resolveFillName('primary', 'surface')).toBe('bg-primary text-primary-foreground');
    expect(resolveFillName('muted', 'surface')).toBe('bg-muted text-muted-foreground');
  });

  it('background pairs irregularly with foreground', () => {
    expect(resolveFillName('background', 'surface')).toBe('bg-background text-foreground');
  });

  it('foreground words never pair a foreground-of-foreground', () => {
    expect(resolveFillName('foreground/80', 'surface')).toBe('bg-foreground/80');
    expect(resolveFillName('primary-foreground', 'surface')).toBe('bg-primary-foreground');
  });

  it('family-position words emit the literal scale utility, no pairing (dark contract: family words never flip)', () => {
    expect(resolveFillName('blue-300', 'surface')).toBe('bg-blue-300');
    expect(resolveFillName('neutral-950/80', 'surface')).toBe('bg-neutral-950/80');
  });

  it('semantic words emit the flipping-var utility (dark contract: semantic words follow .dark)', () => {
    // bg-primary resolves through --primary, which the cascade flips in dark
    // mode -- the signature never carries mode.
    expect(resolveFillName('primary', 'surface')).toContain('bg-primary');
    expect(resolveFillName('primary', 'surface')).not.toContain('dark:');
  });

  it('alpha uses Tailwind slash spelling verbatim', () => {
    expect(resolveFillName('muted/50', 'surface')).toBe('bg-muted/50 text-muted-foreground');
    expect(resolveFillName('muted/50', 'text')).toBe('text-muted/50');
  });

  it('text context emits text color only', () => {
    expect(resolveFillName('primary', 'text')).toBe('text-primary');
    expect(resolveFillName('blue-300', 'text')).toBe('text-blue-300');
  });
});

describe('resolveFillName -- gradient signatures', () => {
  it('two stops expand to Tailwind v4 linear gradient utilities', () => {
    expect(resolveFillName('primary-to-primary/0', 'surface')).toBe(
      'bg-linear-to-b from-primary to-primary/0 text-primary-foreground',
    );
  });

  it('never emits the deprecated v3 bg-gradient-to-* alias', () => {
    expect(resolveFillName('primary-to-primary/0', 'surface')).not.toContain('bg-gradient');
  });

  it('text context emits gradient text via bg-clip-text', () => {
    expect(resolveFillName('primary-to-primary/0', 'text')).toBe(
      'bg-linear-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('per-stop alpha on either side', () => {
    expect(resolveFillName('blue-300/40-to-red-500', 'surface')).toBe(
      'bg-linear-to-b from-blue-300/40 to-red-500',
    );
  });

  it('family-word gradients skip foreground pairing', () => {
    expect(resolveFillName('blue-300-to-red-500', 'surface')).toBe(
      'bg-linear-to-b from-blue-300 to-red-500',
    );
  });
});

describe('resolveFillName -- invalid signatures resolve to nothing (runtime never crashes)', () => {
  it.each([
    ['', 'empty'],
    ['  ', 'whitespace'],
    ['primary muted', 'spaces -- fill is a single signature'],
    ['a-to-b-to-c', 'three stops'],
    ['primary/blur', 'non-numeric alpha'],
    ['primary/101', 'alpha out of range'],
    ['Primary', 'uppercase'],
    ['-primary', 'leading hyphen'],
  ])('%s (%s) resolves to empty', (input) => {
    expect(resolveFillName(input, 'surface')).toBe('');
    expect(resolveFillName(input, 'text')).toBe('');
  });

  it('undefined resolves to empty', () => {
    expect(resolveFillName(undefined, 'surface')).toBe('');
  });
});

describe('parity with @rafters/shared fill-signature (canonical implementation)', () => {
  const FIXTURES = [
    'primary',
    'muted/50',
    'background',
    'foreground/80',
    'blue-300',
    'neutral-950/80',
    'primary-to-primary/0',
    'blue-300/40-to-red-500',
    'primary-foreground',
  ] as const;

  it.each(FIXTURES.flatMap((f) => (['surface', 'text'] as const).map((c) => [f, c] as const)))(
    '%s in %s context matches shared expansion',
    (input, context) => {
      const parsed = parseFillSignature(input);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const expected = expandFillSignature(parsed.signature, context as SharedFillContext);
      expect(resolveFillName(input, context)).toBe(expected);
    },
  );

  it.each(['', 'primary muted', 'a-to-b-to-c', 'primary/101'])(
    'invalid input %j rejected by both',
    (input) => {
      expect(parseFillSignature(input).ok).toBe(false);
      expect(resolveFillName(input, 'surface')).toBe('');
    },
  );
});
