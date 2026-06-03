import { describe, expect, it } from 'vitest';
import { validateBlocks } from '../src/rules';

/**
 * Editor parity gap #7 (docs/EDITOR_PARITY_GOAL.md; editor-known-gaps.mdx
 * "Rule Runtime Validation Gap"). Blocks declare rules, and built-in-rules/*
 * are Zod schemas, but nothing ever validated a block's content against the
 * schema of its rules. validateBlocks is that engine.
 */
describe('validateBlocks', () => {
  it('passes a block whose content satisfies its rule', () => {
    expect(validateBlocks([{ id: 'b1', content: 'a@b.com', rules: ['email'] }])).toEqual([]);
  });

  it('flags a block whose content violates its rule', () => {
    const errors = validateBlocks([{ id: 'b1', content: 'not-an-email', rules: ['email'] }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ blockId: 'b1', rule: 'email' });
  });

  it('flags a required field that is empty', () => {
    const errors = validateBlocks([{ id: 'b2', content: '', rules: ['required'] }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.rule).toBe('required');
  });

  it('reports unknown rules instead of silently passing them', () => {
    const errors = validateBlocks([{ id: 'b3', content: 'x', rules: ['nonexistent'] }]);
    expect(errors[0]?.message).toContain('Unknown rule');
  });

  it('resolves the rule name from a parameterized {name, config} rule', () => {
    expect(
      validateBlocks([{ id: 'b4', content: 'a@b.com', rules: [{ name: 'email', config: {} }] }]),
    ).toEqual([]);
  });

  it('ignores blocks without rules', () => {
    expect(validateBlocks([{ id: 'b5', content: 'whatever' }])).toEqual([]);
  });

  it('coerces InlineContent[] content to text before validating', () => {
    expect(
      validateBlocks([
        { id: 'b6', content: [{ text: 'a@' }, { text: 'b.com' }], rules: ['email'] },
      ]),
    ).toEqual([]);
  });
});
