import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPOSITE_MAX_DEPTH } from '../src/constants';

/**
 * Editor parity gap #6 (docs/EDITOR_PARITY_GOAL.md; editor-known-gaps.mdx
 * "Asymmetric Circular-Reference Depth Limits"). The serializer (toMdx,
 * MAX_DEPTH=50) and the instantiator (instantiateBlocks, maxDepth=10) capped
 * recursion at different depths -- a pathological composite could serialize but
 * not instantiate. Both now share one constant.
 */
describe('composite recursion depth is a single shared constant', () => {
  it('COMPOSITE_MAX_DEPTH is 10', () => {
    expect(COMPOSITE_MAX_DEPTH).toBe(10);
  });

  it('serializer and bridge use the shared constant, not divergent hard-coded limits', () => {
    const read = (f: string) => readFileSync(join(__dirname, '..', 'src', f), 'utf8');
    const serializer = read('serializer.ts');
    const bridge = read('bridge.ts');

    expect(serializer).toContain('COMPOSITE_MAX_DEPTH');
    expect(serializer).not.toMatch(/MAX_DEPTH\s*=\s*50/);
    expect(bridge).toContain('COMPOSITE_MAX_DEPTH');
    expect(bridge).not.toMatch(/maxDepth\s*\?\?\s*10\b/);
  });
});
