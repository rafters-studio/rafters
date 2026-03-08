import { describe, expect, it } from 'vitest';
import {
  AppliedRuleSchema,
  CompositeBlockSchema,
  CompositeFileSchema,
  CompositeManifestSchema,
} from '../src/manifest';

const validManifest = {
  id: 'auth-dashboard',
  name: 'Auth Dashboard',
  category: 'layout' as const,
  description: 'Login form with user profile sidebar',
  keywords: ['auth', 'login'],
  cognitiveLoad: 4,
};

describe('AppliedRuleSchema', () => {
  it('accepts a simple string rule', () => {
    expect(AppliedRuleSchema.parse('email')).toBe('email');
  });

  it('accepts a parameterized rule', () => {
    const rule = { name: 'min-length', config: { min: 8 } };
    expect(AppliedRuleSchema.parse(rule)).toEqual(rule);
  });

  it('rejects parameterized rule with empty name', () => {
    expect(() => AppliedRuleSchema.parse({ name: '', config: {} })).toThrow();
  });
});

describe('CompositeBlockSchema', () => {
  it('accepts a minimal block', () => {
    const block = CompositeBlockSchema.parse({ id: '1', type: 'text' });
    expect(block.id).toBe('1');
    expect(block.type).toBe('text');
    expect(block.content).toBeUndefined();
  });

  it('accepts a block with all fields', () => {
    const block = CompositeBlockSchema.parse({
      id: '1',
      type: 'input',
      content: '',
      children: ['2', '3'],
      parentId: 'root',
      meta: { placeholder: 'Enter email' },
      rules: ['email', { name: 'min-length', config: { min: 5 } }],
    });
    expect(block.rules).toHaveLength(2);
    expect(block.children).toEqual(['2', '3']);
  });

  it('rejects empty id', () => {
    expect(() => CompositeBlockSchema.parse({ id: '', type: 'text' })).toThrow();
  });

  it('rejects empty type', () => {
    expect(() => CompositeBlockSchema.parse({ id: '1', type: '' })).toThrow();
  });
});

describe('CompositeManifestSchema', () => {
  it('validates a correct manifest', () => {
    const result = CompositeManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('rejects uppercase ID', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, id: 'AuthDashboard' });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, category: '' });
    expect(result.success).toBe(false);
  });

  it('rejects cognitiveLoad below 1', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, cognitiveLoad: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects cognitiveLoad above 10', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, cognitiveLoad: 11 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer cognitiveLoad', () => {
    const result = CompositeManifestSchema.safeParse({ ...validManifest, cognitiveLoad: 3.5 });
    expect(result.success).toBe(false);
  });
});

describe('CompositeFileSchema', () => {
  it('validates a complete composite file', () => {
    const valid = CompositeFileSchema.parse({
      manifest: validManifest,
      input: ['email', 'password'],
      output: ['credentials'],
      blocks: [
        { id: '1', type: 'grid', meta: { columns: 2 }, children: ['2', '3'] },
        { id: '2', type: 'composite:login-form', parentId: '1' },
        { id: '3', type: 'composite:user-profile', parentId: '1' },
      ],
    });
    expect(valid.blocks).toHaveLength(3);
    expect(valid.input).toEqual(['email', 'password']);
    expect(valid.output).toEqual(['credentials']);
  });

  it('defaults input and output to empty arrays', () => {
    const noIO = CompositeFileSchema.parse({
      manifest: {
        ...validManifest,
        id: 'heading',
        name: 'Heading',
        category: 'typography',
        cognitiveLoad: 1,
      },
      blocks: [{ id: '1', type: 'heading', content: 'Hello' }],
    });
    expect(noIO.input).toEqual([]);
    expect(noIO.output).toEqual([]);
  });

  it('rejects empty blocks array', () => {
    expect(() =>
      CompositeFileSchema.parse({
        manifest: validManifest,
        blocks: [],
      }),
    ).toThrow();
  });

  it('validates blocks with rules', () => {
    const withRules = CompositeFileSchema.parse({
      manifest: {
        ...validManifest,
        id: 'email-form',
        name: 'Email Form',
        category: 'form',
        cognitiveLoad: 3,
      },
      input: ['email'],
      output: ['credentials'],
      blocks: [
        {
          id: '1',
          type: 'input',
          content: '',
          rules: ['email', { name: 'min-length', config: { min: 5 } }],
        },
      ],
    });
    expect(withRules.blocks[0].rules).toHaveLength(2);
  });

  it('accepts blocks without content (layout blocks)', () => {
    const layout = CompositeFileSchema.parse({
      manifest: { ...validManifest, id: 'two-column', name: 'Two Column', cognitiveLoad: 2 },
      blocks: [
        { id: '1', type: 'grid', meta: { columns: 2 }, children: ['2', '3'] },
        { id: '2', type: 'text', content: 'Left', parentId: '1' },
        { id: '3', type: 'text', content: 'Right', parentId: '1' },
      ],
    });
    expect(layout.blocks[0].content).toBeUndefined();
  });
});
