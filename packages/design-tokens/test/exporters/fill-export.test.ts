/**
 * Fill token CSS export tests
 */

import { describe, expect, it } from 'vitest';
import { buildColorSystem } from '../../src/generators';

describe('fill token CSS export', () => {
  it('includes fill tokens in tailwind CSS output', () => {
    const result = buildColorSystem({
      exports: { tailwind: true },
    });

    const css = result.exports.tailwind;
    expect(css).toBeDefined();
    expect(css).toContain('--fill-surface');
    expect(css).toContain('--fill-overlay');
    expect(css).toContain('--fill-glass');
    expect(css).toContain('--fill-hero');
    expect(css).toContain('--fill-primary');
    expect(css).toContain('--fill-muted');
    expect(css).toContain('--fill-panel');
  });

  it('includes fill tokens in @theme block', () => {
    const result = buildColorSystem({
      exports: { tailwind: true },
    });

    const css = result.exports.tailwind;
    // Fill tokens appear in @theme with their JSON metadata values
    expect(css).toContain('--fill-surface:');
    expect(css).toContain('--fill-overlay:');
    expect(css).toContain('--fill-hero:');
  });

  it('fill namespace appears in generated system metadata', () => {
    const result = buildColorSystem();

    expect(result.system.metadata.namespaces).toContain('fill');
  });

  it('fill tokens are in the registry', () => {
    const result = buildColorSystem();

    // getAllTokens returns string[] of token names
    const allNames = result.registry.getAllTokens();
    const fillNames = allNames.filter((name) => name.startsWith('fill-'));

    expect(fillNames.length).toBeGreaterThan(0);
    expect(fillNames).toContain('fill-surface');
    expect(fillNames).toContain('fill-hero');
  });
});
