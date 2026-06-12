/**
 * Fill signature tests (#1637) -- the canonical parse/validate/expand.
 *
 * The signature is color vocabulary only: word | word/alpha | word-to-word.
 * '-to-' is reserved in the color namer, so the split is deterministic.
 * Validation names the unresolvable word (the #1632 lesson: split only at
 * reserved separators, require vocabulary resolution on every side).
 */

import { describe, expect, it } from 'vitest';
import {
  expandFillSignature,
  foregroundWordFor,
  parseFillSignature,
  validateFillSignature,
} from '../src/fill-signature';

describe('parseFillSignature', () => {
  it('parses a bare word', () => {
    const r = parseFillSignature('barbie-pink');
    expect(r).toEqual({ ok: true, signature: { stops: [{ word: 'barbie-pink' }] } });
  });

  it('parses word/alpha with Tailwind slash spelling', () => {
    const r = parseFillSignature('muted/50');
    expect(r).toEqual({ ok: true, signature: { stops: [{ word: 'muted', alpha: 50 }] } });
  });

  it('parses a two-stop gradient at the first -to-', () => {
    const r = parseFillSignature('barbie-pink-to-ken-brown');
    expect(r).toEqual({
      ok: true,
      signature: { stops: [{ word: 'barbie-pink' }, { word: 'ken-brown' }] },
    });
  });

  it('parses per-stop alpha', () => {
    const r = parseFillSignature('primary-to-primary/0');
    expect(r).toEqual({
      ok: true,
      signature: { stops: [{ word: 'primary' }, { word: 'primary', alpha: 0 }] },
    });
  });

  it('accepts boundary alphas 0 and 100, rejects beyond', () => {
    expect(parseFillSignature('primary/0').ok).toBe(true);
    expect(parseFillSignature('primary/100').ok).toBe(true);
    expect(parseFillSignature('primary/101').ok).toBe(false);
    expect(parseFillSignature('primary/-1').ok).toBe(false);
    expect(parseFillSignature('primary/5.5').ok).toBe(false);
  });

  it('rejects three stops', () => {
    const r = parseFillSignature('a-to-b-to-c');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('two stops');
  });

  it('rejects spaces -- fill is a single signature', () => {
    const r = parseFillSignature('primary to-b');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('single signature');
  });

  it('rejects empty and malformed words', () => {
    expect(parseFillSignature('').ok).toBe(false);
    expect(parseFillSignature('Primary').ok).toBe(false);
    expect(parseFillSignature('-primary').ok).toBe(false);
    expect(parseFillSignature('primary-').ok).toBe(false);
  });
});

describe('validateFillSignature', () => {
  const vocab = new Set(['primary', 'muted', 'barbie-pink', 'ken-brown', 'blue-300']);
  const hasWord = (w: string) => vocab.has(w);

  it('passes when every word resolves', () => {
    const r = parseFillSignature('barbie-pink-to-ken-brown');
    if (!r.ok) throw new Error('parse failed');
    expect(validateFillSignature(r.signature, hasWord)).toBeNull();
  });

  it('names the unresolvable word', () => {
    const r = parseFillSignature('barbie-pink-to-bogus-word');
    if (!r.ok) throw new Error('parse failed');
    expect(validateFillSignature(r.signature, hasWord)).toBe('bogus-word');
  });

  it('alpha does not affect resolution', () => {
    const r = parseFillSignature('blue-300/40');
    if (!r.ok) throw new Error('parse failed');
    expect(validateFillSignature(r.signature, hasWord)).toBeNull();
  });
});

describe('foregroundWordFor', () => {
  it('pairs role words', () => {
    expect(foregroundWordFor('primary')).toBe('primary-foreground');
    expect(foregroundWordFor('panel')).toBe('panel-foreground');
  });

  it('background pairs irregularly with foreground', () => {
    expect(foregroundWordFor('background')).toBe('foreground');
  });

  it('never pairs family-position or foreground words', () => {
    expect(foregroundWordFor('blue-300')).toBeNull();
    expect(foregroundWordFor('foreground')).toBeNull();
    expect(foregroundWordFor('primary-foreground')).toBeNull();
  });
});

describe('expandFillSignature', () => {
  function expand(input: string, context: 'surface' | 'text', hasWord?: (w: string) => boolean) {
    const r = parseFillSignature(input);
    if (!r.ok) throw new Error(`parse failed: ${r.reason}`);
    return expandFillSignature(r.signature, context, hasWord);
  }

  it('solid surface pairs the foreground', () => {
    expect(expand('primary', 'surface')).toBe('bg-primary text-primary-foreground');
  });

  it('hasWord gates the foreground pairing to the vocabulary', () => {
    const vocab = new Set(['primary']);
    expect(expand('primary', 'surface', (w) => vocab.has(w))).toBe('bg-primary');
    vocab.add('primary-foreground');
    expect(expand('primary', 'surface', (w) => vocab.has(w))).toBe(
      'bg-primary text-primary-foreground',
    );
  });

  it('gradients emit Tailwind v4 utilities, never the deprecated v3 alias', () => {
    const out = expand('primary-to-primary/0', 'surface');
    expect(out).toBe('bg-linear-to-b from-primary to-primary/0 text-primary-foreground');
    expect(out).not.toContain('bg-gradient');
  });

  it('text context: solid emits text color, gradient clips to text', () => {
    expect(expand('muted/50', 'text')).toBe('text-muted/50');
    expect(expand('primary-to-primary/0', 'text')).toBe(
      'bg-linear-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('dark contract is carried by the emitted utility, not the signature', () => {
    // Semantic word: utility over a flipping var. Family word: literal scale
    // utility. Neither carries a mode -- the signature never says dark.
    expect(expand('primary', 'text')).toBe('text-primary');
    expect(expand('blue-300', 'text')).toBe('text-blue-300');
  });
});
