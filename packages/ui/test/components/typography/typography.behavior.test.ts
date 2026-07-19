import { describe, expect, it } from 'vitest';
import {
  resolveVariant,
  typography,
  variantForElement,
  variantToTag,
  type TypographyVariant,
} from '../../../src/components/typography/typography.behavior';

describe('typography score', () => {
  it('is a static: one part, empty aria, no keymap, no state', () => {
    expect(Object.keys(typography.parts)).toEqual(['root']);
    expect(typography.parts.root).toEqual({});
    expect(typography.initialState({})).toEqual({});
    expect(typography.aria({}, {}, { root: 'r' })).toEqual({ root: {} });
    expect(typography.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
    expect(typography.canDispatch({}, 'noop' as never, {})).toBe(true);
  });
});

describe('variantToTag', () => {
  it('maps each variant to its semantic element', () => {
    expect(variantToTag.h1).toBe('h1');
    expect(variantToTag.h4).toBe('h4');
    expect(variantToTag.p).toBe('p');
    // Presentational variants render <p>.
    expect(variantToTag.lead).toBe('p');
    expect(variantToTag.large).toBe('p');
    expect(variantToTag.muted).toBe('p');
    expect(variantToTag.small).toBe('small');
    expect(variantToTag.code).toBe('code');
    expect(variantToTag.codeblock).toBe('pre');
    expect(variantToTag.blockquote).toBe('blockquote');
    expect(variantToTag.mark).toBe('mark');
    expect(variantToTag.abbr).toBe('abbr');
    expect(variantToTag.ul).toBe('ul');
    expect(variantToTag.ol).toBe('ol');
    expect(variantToTag.li).toBe('li');
  });

  it('covers every variant in the vocabulary', () => {
    const variants: TypographyVariant[] = [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'lead',
      'large',
      'small',
      'muted',
      'code',
      'codeblock',
      'blockquote',
      'mark',
      'abbr',
      'ul',
      'ol',
      'li',
    ];
    for (const variant of variants) {
      expect(variantToTag[variant]).toBeTruthy();
    }
  });
});

describe('resolveVariant', () => {
  it('passes known variants through', () => {
    expect(resolveVariant('h2')).toBe('h2');
    expect(resolveVariant('blockquote')).toBe('blockquote');
  });

  it('falls back to p for unknown, empty, or non-string values -- never throws', () => {
    expect(resolveVariant('display')).toBe('p');
    expect(resolveVariant('')).toBe('p');
    expect(resolveVariant(null)).toBe('p');
    expect(resolveVariant(undefined)).toBe('p');
    expect(resolveVariant(42)).toBe('p');
  });
});

describe('variantForElement', () => {
  it('derives the variant from the native element', () => {
    expect(variantForElement('h1')).toBe('h1');
    expect(variantForElement('blockquote')).toBe('blockquote');
    expect(variantForElement('code')).toBe('code');
  });

  it('span reads as body text', () => {
    expect(variantForElement('span')).toBe('p');
  });

  it('h5 and h6 have no scale of their own and borrow h4', () => {
    expect(variantForElement('h5')).toBe('h4');
    expect(variantForElement('h6')).toBe('h4');
  });
});
