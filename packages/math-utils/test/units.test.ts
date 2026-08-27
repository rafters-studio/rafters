/**
 * Unit tests for the Unit schema, default registry, and operations.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_UNITS, tryParseUnit, type Unit, UnitSchema } from '../src/units.js';

describe('UnitSchema and DEFAULT_UNITS', () => {
  it('every default unit validates', () => {
    for (const u of DEFAULT_UNITS) {
      expect(UnitSchema.safeParse(u).success).toBe(true);
    }
  });

  it('contains common CSS units', () => {
    for (const name of ['px', 'rem', 'em', '%', 'vw', 'vh', 'ch', 'ex', 'cm', 'mm', 'in', 'pt']) {
      expect(DEFAULT_UNITS.find((u) => u.name === name)).toBeDefined();
    }
  });
});

describe('tryParseUnit', () => {
  it('parses px', () => {
    const result = tryParseUnit('16px');
    expect(result?.value).toBe(16);
    expect(result?.unit.name).toBe('px');
  });

  it('parses rem and decimal', () => {
    expect(tryParseUnit('1.5rem')?.value).toBe(1.5);
    expect(tryParseUnit('1.5rem')?.unit.name).toBe('rem');
  });

  it('parses negative values', () => {
    expect(tryParseUnit('-10px')?.value).toBe(-10);
  });

  it('parses unitless numbers', () => {
    expect(tryParseUnit('16')?.value).toBe(16);
    expect(tryParseUnit('16')?.unit.name).toBe('');
  });

  it('handles whitespace', () => {
    expect(tryParseUnit('  16px  ')?.value).toBe(16);
  });

  it('returns null on invalid input instead of throwing', () => {
    expect(tryParseUnit('invalid')).toBeNull();
    expect(tryParseUnit('16xyz')).toBeNull();
  });

  it('accepts a custom registry', () => {
    const registry: Unit[] = [{ name: 'twip', kind: 'length', toBase: 1 / 1440 }];
    expect(tryParseUnit('100twip', registry)?.unit.name).toBe('twip');
    expect(tryParseUnit('100px', registry)).toBeNull();
  });
});
