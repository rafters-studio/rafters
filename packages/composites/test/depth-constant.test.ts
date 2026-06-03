import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPOSITE_MAX_DEPTH } from '../src/constants';

/**
 * Editor parity gap #6 (docs/EDITOR_PARITY_GOAL.md; editor-known-gaps.mdx
 * "Asymmetric Circular-Reference Depth Limits"). The instantiator
 * (instantiateBlocks) caps nested-composite recursion via a shared constant.
 * (The legacy toMdx serializer that shared this limit was removed in gap #4 --
 * the canonical MDX serializer is `mdxSerializer` in @rafters/ui -- so the
 * constant now governs the instantiator alone.)
 */
describe('composite recursion depth is a single shared constant', () => {
  it('COMPOSITE_MAX_DEPTH is 10', () => {
    expect(COMPOSITE_MAX_DEPTH).toBe(10);
  });

  it('the block instantiator uses the shared constant, not a hard-coded limit', () => {
    const bridge = readFileSync(join(__dirname, '..', 'src', 'bridge.ts'), 'utf8');
    expect(bridge).toContain('COMPOSITE_MAX_DEPTH');
    expect(bridge).not.toMatch(/maxDepth\s*\?\?\s*10\b/);
  });
});
