import { describe, expect, it } from 'vitest';
import { formValueAttrs, isFormAssociated } from './form-value';

describe('form-value', () => {
  it('is form-associated only with a non-empty name', () => {
    expect(isFormAssociated({})).toBe(false);
    expect(isFormAssociated({ name: '' })).toBe(false);
    expect(isFormAssociated({ name: 'fruit' })).toBe(true);
  });

  it('returns null when there is no name (nothing to submit)', () => {
    expect(formValueAttrs({ value: 'apple' })).toBeNull();
    expect(formValueAttrs({})).toBeNull();
  });

  it('builds the hidden input attrs when named', () => {
    expect(formValueAttrs({ name: 'fruit', value: 'apple' })).toEqual({
      type: 'hidden',
      name: 'fruit',
      value: 'apple',
    });
  });

  it('defaults an absent value to the empty string (present-but-empty field)', () => {
    expect(formValueAttrs({ name: 'fruit' })).toEqual({
      type: 'hidden',
      name: 'fruit',
      value: '',
    });
  });
});
