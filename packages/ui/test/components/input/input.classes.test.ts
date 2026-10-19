import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  shadowRungPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import { inputBehavior } from '../../../src/components/input/input.behavior';
import { inputClassSet } from '../../../src/components/input/input.classes';

const config = {};
const classes = inputClassSet(config, inputBehavior.initialState(config));

const withIcons = (icons: { startIcon?: boolean; endIcon?: boolean }) =>
  inputClassSet(icons, inputBehavior.initialState(icons));

describe('input classes', () => {
  it('fills transparently and borders on a semantic token, never a page bg', () => {
    expect(classes.input).toContain('bg-transparent');
    expect(classes.input).toContain('border-input');
    expect(classes.input).not.toContain('bg-background');
  });

  it('styles validity off the projected aria-invalid', () => {
    expect(classes.input).toContain('aria-invalid:border-destructive');
    expect(classes.input).toContain('aria-invalid:focus-visible:ring-destructive-ring');
  });

  it('carries a token focus ring', () => {
    expect(classes.input).toContain('focus-visible:ring-2');
    expect(classes.input).toContain('focus-visible:ring-ring');
  });

  it('honors disabled and read-only affordances', () => {
    expect(classes.input).toContain('disabled:cursor-not-allowed');
    expect(classes.input).toContain('read-only:cursor-default');
  });

  it('motion is the focus row and the validity row, composed as generics (#2288)', () => {
    // root / focus -- ring -- duration-micro, ease-linear
    expect(classes.input).toContain('transition-[box-shadow,border-color]');
    expect(classes.input).toContain('duration-micro');
    expect(classes.input).toContain('ease-linear');
    // root / valid <-> invalid -- color -- duration-fast, ease-standard
    expect(classes.input).toContain('aria-invalid:duration-fast');
    expect(classes.input).toContain('aria-invalid:ease-standard');
    // The reduced-motion law is written once on the token leaves; a
    // component-level escape fights it, so there is none to find here.
    expect(classes.input).not.toContain('motion-reduce:');
  });

  it('the error message uses the destructive text token', () => {
    expect(classes.error).toContain('text-destructive');
  });
});

describe('input icon classes', () => {
  it('the row is a grid whose columns follow reading order, with no physical direction', () => {
    const { row } = withIcons({ startIcon: true });
    const tokens = row.split(' ');
    for (const literal of ['grid', 'grid-flow-col', 'items-center', 'gap-2']) {
      expect(tokens).toContain(literal);
    }
    expect(row).not.toMatch(/(^|\s)(p[lr]|m[lr]|left|right|float)-/);
    expect(row).not.toMatch(/(^|\s)(flex|inline-flex)(\s|$)/);
  });

  it('names one track list per icon combination, so no icon leaves no empty track', () => {
    expect(withIcons({ startIcon: true }).row).toContain('grid-cols-affix-start');
    expect(withIcons({ endIcon: true }).row).toContain('grid-cols-affix-end');
    expect(withIcons({ startIcon: true, endIcon: true }).row).toContain('grid-cols-affix-both');
  });

  it('the wrappers only place and hide, never size', () => {
    const set = withIcons({ startIcon: true, endIcon: true });
    expect(set.startIcon).toBe('inline-grid place-items-center');
    expect(set.endIcon).toBe('inline-grid place-items-center');
    expect(set.addonStart).not.toMatch(/(^|\s)(h|w|size)-/);
  });

  it('padding tightens on the icon side only, with logical classes', () => {
    const { row } = withIcons({ startIcon: true, endIcon: true });
    expect(row).toContain('has-data-[icon=inline-start]:ps-2');
    expect(row).toContain('has-data-[icon=inline-end]:pe-2');
  });

  it('the row draws the chrome and the field inside draws none', () => {
    const set = withIcons({ startIcon: true });
    expect(set.row).toContain('border-input');
    expect(set.row).toContain('focus-within:ring-2');
    expect(set.row).toContain('has-[[aria-invalid=true]]:border-destructive');
    expect(set.rowInput).toContain('border-0');
    expect(set.rowInput).not.toContain('ring-2');
  });

  it('classy keeps every new literal', () => {
    for (const icons of [
      { startIcon: true },
      { endIcon: true },
      { startIcon: true, endIcon: true },
    ]) {
      const set = withIcons(icons);
      const kept = classy(set.row).split(' ');
      const added = set.row
        .split(' ')
        .filter(
          (c) =>
            c.includes('has-') ||
            c.includes('grid') ||
            c === 'items-center' ||
            c === 'gap-2' ||
            c.startsWith('focus-within:'),
        );
      expect(added.length).toBeGreaterThan(8);
      for (const literal of added) {
        expect(kept, `classy dropped ${literal}`).toContain(literal);
      }
      expect(classy(set.rowInput)).toBe(set.rowInput);
      expect(classy(set.startIcon)).toBe(set.startIcon);
      expect(classy(set.addonStart)).toBe(set.addonStart);
    }
  });
});

/**
 * Tailwind drops a malformed candidate SILENTLY, so this points the real
 * Tailwind CLI at the real component directory and checks the emitted sheet.
 */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('input icon candidates compile', () => {
  it('every icon candidate became a real rule, on logical edges', async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
      mirrorPlugin,
      shadowRungPlugin,
    ]);
    const css = await registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/input')],
    });
    const candidates = [
      ...withIcons({ startIcon: true }).row.split(' '),
      ...withIcons({ endIcon: true }).row.split(' '),
      ...withIcons({ startIcon: true, endIcon: true }).row.split(' '),
      ...withIcons({ startIcon: true }).startIcon.split(' '),
    ].filter(
      (c) =>
        c.includes('data-[icon') ||
        c.includes('grid-cols-affix') ||
        c.includes('aria-invalid=true') ||
        c.startsWith('has-disabled') ||
        c === 'grid' ||
        c === 'grid-flow-col' ||
        c === 'place-items-center',
    );
    const missing = [...new Set(candidates)].filter((c) => !css.includes(escapeCandidate(c)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    expect(css).toMatch(/padding-inline-start/);
    expect(css).toMatch(/padding-inline-end/);
    expect(css).toMatch(/grid-template-columns:\s*auto 1fr auto/);
  }, 120_000);
});
