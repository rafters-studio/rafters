import { describe, expect, it } from 'vitest';
import { resolveBlockTag } from '../src/resolve-block';

describe('resolveBlockTag', () => {
  describe('composite references', () => {
    it('resolves composite:<id> to a composite outcome carrying the id', () => {
      expect(resolveBlockTag('composite:login-form')).toEqual({
        kind: 'composite',
        id: 'login-form',
      });
    });

    it('resolves a single-word composite id', () => {
      expect(resolveBlockTag('composite:sidebar')).toEqual({ kind: 'composite', id: 'sidebar' });
    });

    it('preserves the full id after the prefix, including extra colons', () => {
      expect(resolveBlockTag('composite:a:b')).toEqual({ kind: 'composite', id: 'a:b' });
    });

    it('treats an empty composite id as an empty-id composite outcome', () => {
      expect(resolveBlockTag('composite:')).toEqual({ kind: 'composite', id: '' });
    });

    it('trims surrounding whitespace before detecting the prefix', () => {
      expect(resolveBlockTag('  composite:hero  ')).toEqual({ kind: 'composite', id: 'hero' });
    });
  });

  describe('native HTML aliases', () => {
    const cases: Array<[string, string]> = [
      ['link', 'a'],
      ['image', 'img'],
      ['text', 'span'],
      ['heading', 'h2'],
      ['list', 'ul'],
    ];

    for (const [type, tag] of cases) {
      it(`maps "${type}" to native <${tag}>`, () => {
        expect(resolveBlockTag(type)).toEqual({ kind: 'native', tag });
      });
    }

    it('trims whitespace before matching a native alias', () => {
      expect(resolveBlockTag('  heading ')).toEqual({ kind: 'native', tag: 'h2' });
    });
  });

  describe('default native fallback', () => {
    it('falls back to <div> for an empty string', () => {
      expect(resolveBlockTag('')).toEqual({ kind: 'native', tag: 'div' });
    });

    it('falls back to <div> for a whitespace-only string', () => {
      expect(resolveBlockTag('   ')).toEqual({ kind: 'native', tag: 'div' });
    });
  });

  describe('user components', () => {
    it('resolves an unknown kebab name to a component outcome', () => {
      expect(resolveBlockTag('button')).toEqual({ kind: 'component', name: 'button' });
    });

    it('resolves a multi-word kebab name to a component outcome', () => {
      expect(resolveBlockTag('icon-button')).toEqual({ kind: 'component', name: 'icon-button' });
    });

    it('does not treat native aliases as components', () => {
      expect(resolveBlockTag('link').kind).toBe('native');
    });

    it('trims whitespace from a component name', () => {
      expect(resolveBlockTag('  card  ')).toEqual({ kind: 'component', name: 'card' });
    });
  });

  describe('exhaustive discriminant coverage', () => {
    it('every outcome carries exactly its discriminant payload', () => {
      const composite = resolveBlockTag('composite:x');
      const component = resolveBlockTag('whatever');
      const native = resolveBlockTag('text');

      expect(composite.kind === 'composite' && composite.id).toBe('x');
      expect(component.kind === 'component' && component.name).toBe('whatever');
      expect(native.kind === 'native' && native.tag).toBe('span');
    });
  });
});
