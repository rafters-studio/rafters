import { describe, expect, it } from 'vitest';
import type { AppliedRule } from '../src/manifest';
import { rulesToHtmlAttrs } from '../src/rule-attrs';

describe('rulesToHtmlAttrs', () => {
  describe('built-in string rules', () => {
    it('maps "required" to { required: true }', () => {
      expect(rulesToHtmlAttrs(['required'])).toEqual({ required: true });
    });

    it('maps "email" to { type: "email" }', () => {
      expect(rulesToHtmlAttrs(['email'])).toEqual({ type: 'email' });
    });

    it('maps "url" to { type: "url" }', () => {
      expect(rulesToHtmlAttrs(['url'])).toEqual({ type: 'url' });
    });

    it('maps "password" to { type: "password", minlength: 8 }', () => {
      expect(rulesToHtmlAttrs(['password'])).toEqual({ type: 'password', minlength: 8 });
    });
  });

  describe('parameterized rules', () => {
    it('maps a pattern rule to { pattern }', () => {
      const rules: AppliedRule[] = [{ name: 'pattern', config: { pattern: '[0-9]{3}' } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ pattern: '[0-9]{3}' });
    });

    it('maps a minlength rule to { minlength: value }', () => {
      const rules: AppliedRule[] = [{ name: 'minlength', config: { value: 4 } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ minlength: 4 });
    });

    it('maps a maxlength rule to { maxlength: value }', () => {
      const rules: AppliedRule[] = [{ name: 'maxlength', config: { value: 64 } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ maxlength: 64 });
    });

    it('accepts a numeric string config value for minlength', () => {
      const rules: AppliedRule[] = [{ name: 'minlength', config: { value: '12' } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ minlength: 12 });
    });

    it('ignores a pattern rule with a non-string pattern', () => {
      const rules: AppliedRule[] = [{ name: 'pattern', config: { pattern: 42 } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({});
    });

    it('ignores a minlength rule with a non-numeric value', () => {
      const rules: AppliedRule[] = [{ name: 'minlength', config: { value: 'abc' } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({});
    });

    it('honors a built-in string rule supplied in object form', () => {
      const rules: AppliedRule[] = [{ name: 'email', config: {} }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ type: 'email' });
    });
  });

  describe('unknown rules', () => {
    it('ignores an unknown string rule name', () => {
      expect(rulesToHtmlAttrs(['nonexistent-rule'])).toEqual({});
    });

    it('ignores an unknown parameterized rule name', () => {
      const rules: AppliedRule[] = [{ name: 'made-up', config: { whatever: true } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({});
    });

    it('ignores "credentials" (a composite-level rule with no element attrs)', () => {
      expect(rulesToHtmlAttrs(['credentials'])).toEqual({});
    });
  });

  describe('empty and undefined input', () => {
    it('maps undefined to {}', () => {
      expect(rulesToHtmlAttrs(undefined)).toEqual({});
    });

    it('maps an empty array to {}', () => {
      expect(rulesToHtmlAttrs([])).toEqual({});
    });
  });

  describe('combining rules', () => {
    it('merges multiple distinct rules into one attribute bag', () => {
      expect(rulesToHtmlAttrs(['email', 'required'])).toEqual({
        type: 'email',
        required: true,
      });
    });

    it('lets a later rule win on attribute conflict', () => {
      const rules: AppliedRule[] = ['password', { name: 'minlength', config: { value: 16 } }];
      expect(rulesToHtmlAttrs(rules)).toEqual({ type: 'password', minlength: 16 });
    });

    it('drops unknown rules while keeping the known ones', () => {
      expect(rulesToHtmlAttrs(['email', 'mystery', 'required'])).toEqual({
        type: 'email',
        required: true,
      });
    });
  });

  describe('purity', () => {
    it('does not mutate its input and returns a fresh object each call', () => {
      const rules: AppliedRule[] = ['email'];
      const first = rulesToHtmlAttrs(rules);
      const second = rulesToHtmlAttrs(rules);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(rules).toEqual(['email']);
    });
  });
});
