import { describe, expect, it } from 'vitest';
import type { CompositeBlock, CompositeFile } from '../src/manifest';
import {
  deriveCompositeBoundary,
  findCompatibleConsumers,
  findCompatibleProducers,
  matchRules,
} from '../src/rules';

function makeComposite(
  overrides: Partial<Pick<CompositeFile, 'input' | 'output'>> & {
    id?: string;
  } = {},
): CompositeFile {
  return {
    manifest: {
      id: overrides.id ?? 'test',
      name: 'Test',
      category: 'widget',
      description: 'test',
      keywords: [],
      cognitiveLoad: 1,
    },
    input: overrides.input ?? [],
    output: overrides.output ?? [],
    blocks: [{ id: '1', type: 'text' }],
  };
}

describe('matchRules', () => {
  it('returns full match when producer satisfies all consumer inputs', () => {
    const producer = makeComposite({ output: ['email', 'password'] });
    const consumer = makeComposite({ input: ['email', 'password'] });
    const result = matchRules(producer, consumer);
    expect(result.matched).toEqual(['email', 'password']);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.compatible).toBe(true);
  });

  it('returns partial match with missing rules', () => {
    const producer = makeComposite({ output: ['email'] });
    const consumer = makeComposite({ input: ['email', 'password'] });
    const result = matchRules(producer, consumer);
    expect(result.matched).toEqual(['email']);
    expect(result.missing).toEqual(['password']);
    expect(result.extra).toEqual([]);
    expect(result.compatible).toBe(false);
  });

  it('returns extra rules when producer has more than consumer needs', () => {
    const producer = makeComposite({ output: ['email', 'password', 'token'] });
    const consumer = makeComposite({ input: ['email', 'password'] });
    const result = matchRules(producer, consumer);
    expect(result.matched).toEqual(['email', 'password']);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(['token']);
    expect(result.compatible).toBe(true);
  });

  it('is compatible when consumer has empty input', () => {
    const producer = makeComposite({ output: ['email'] });
    const consumer = makeComposite({ input: [] });
    const result = matchRules(producer, consumer);
    expect(result.compatible).toBe(true);
    expect(result.matched).toEqual([]);
    expect(result.extra).toEqual(['email']);
  });

  it('is compatible when both have empty I/O', () => {
    const producer = makeComposite({ output: [] });
    const consumer = makeComposite({ input: [] });
    expect(matchRules(producer, consumer).compatible).toBe(true);
  });

  it('is incompatible when producer has empty output but consumer has input', () => {
    const producer = makeComposite({ output: [] });
    const consumer = makeComposite({ input: ['email'] });
    const result = matchRules(producer, consumer);
    expect(result.compatible).toBe(false);
    expect(result.missing).toEqual(['email']);
  });

  it('compares rule names case-sensitively', () => {
    const producer = makeComposite({ output: ['Email'] });
    const consumer = makeComposite({ input: ['email'] });
    const result = matchRules(producer, consumer);
    expect(result.compatible).toBe(false);
    expect(result.missing).toEqual(['email']);
    expect(result.extra).toEqual(['Email']);
  });

  it('handles no overlap between producer and consumer', () => {
    const producer = makeComposite({ output: ['x', 'y'] });
    const consumer = makeComposite({ input: ['a', 'b'] });
    const result = matchRules(producer, consumer);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(['a', 'b']);
    expect(result.extra).toEqual(['x', 'y']);
    expect(result.compatible).toBe(false);
  });
});

describe('findCompatibleConsumers', () => {
  it('returns consumers whose inputs are satisfied by producer output', () => {
    const producer = makeComposite({ output: ['email', 'password'] });
    const loginForm = makeComposite({ id: 'login', input: ['email', 'password'] });
    const dashboard = makeComposite({ id: 'dash', input: ['credentials', 'session'] });
    const anyConsumer = makeComposite({ id: 'any', input: [] });

    const consumers = findCompatibleConsumers(producer, [loginForm, dashboard, anyConsumer]);
    const ids = consumers.map((c) => c.manifest.id);
    expect(ids).toContain('login');
    expect(ids).toContain('any');
    expect(ids).not.toContain('dash');
  });

  it('returns empty array when no candidates match', () => {
    const producer = makeComposite({ output: ['x'] });
    const consumer = makeComposite({ id: 'c', input: ['y'] });
    expect(findCompatibleConsumers(producer, [consumer])).toEqual([]);
  });

  it('returns empty array for empty candidates', () => {
    const producer = makeComposite({ output: ['x'] });
    expect(findCompatibleConsumers(producer, [])).toEqual([]);
  });
});

describe('findCompatibleProducers', () => {
  it('returns producers whose output satisfies consumer input', () => {
    const consumer = makeComposite({ input: ['credentials'] });
    const loginForm = makeComposite({ id: 'login', output: ['credentials'] });
    const emailInput = makeComposite({ id: 'email', output: ['email'] });

    const producers = findCompatibleProducers(consumer, [loginForm, emailInput]);
    const ids = producers.map((p) => p.manifest.id);
    expect(ids).toContain('login');
    expect(ids).not.toContain('email');
  });

  it('returns all candidates when consumer has empty input', () => {
    const consumer = makeComposite({ input: [] });
    const a = makeComposite({ id: 'a', output: ['x'] });
    const b = makeComposite({ id: 'b', output: [] });

    const producers = findCompatibleProducers(consumer, [a, b]);
    expect(producers).toHaveLength(2);
  });

  it('returns empty array for empty candidates', () => {
    const consumer = makeComposite({ input: ['x'] });
    expect(findCompatibleProducers(consumer, [])).toEqual([]);
  });
});

function blk(id: string, io: { input?: string[]; output?: string[] } = {}): CompositeBlock {
  return { id, type: 'text', input: io.input ?? [], output: io.output ?? [] };
}

function compositeOf(blocks: CompositeBlock[]): CompositeFile {
  return {
    manifest: {
      id: 'c',
      name: 'C',
      category: 'widget',
      description: '',
      keywords: [],
      cognitiveLoad: 1,
    },
    input: [],
    output: [],
    blocks,
  };
}

describe('deriveCompositeBoundary', () => {
  it('bubbles up block inputs not produced internally', () => {
    const c = compositeOf([blk('a', { input: ['email'] })]);
    expect(deriveCompositeBoundary(c)).toEqual({ input: ['email'], output: [] });
  });

  it('exposes block outputs not consumed internally', () => {
    const c = compositeOf([blk('a', { output: ['user'] })]);
    expect(deriveCompositeBoundary(c)).toEqual({ input: [], output: ['user'] });
  });

  it('hides internally-wired edges (an output feeds an input by name)', () => {
    const c = compositeOf([
      blk('producer', { output: ['email'] }),
      blk('consumer', { input: ['email'], output: ['valid'] }),
    ]);
    // email is produced and consumed internally -> off the boundary; valid is unconsumed -> boundary output
    expect(deriveCompositeBoundary(c)).toEqual({ input: [], output: ['valid'] });
  });

  it('dedupes and preserves first-seen order', () => {
    const c = compositeOf([
      blk('a', { input: ['x', 'y'] }),
      blk('b', { input: ['x'], output: ['z'] }),
    ]);
    expect(deriveCompositeBoundary(c)).toEqual({ input: ['x', 'y'], output: ['z'] });
  });

  it('is empty for blocks without I/O', () => {
    const c = compositeOf([blk('a'), blk('b')]);
    expect(deriveCompositeBoundary(c)).toEqual({ input: [], output: [] });
  });

  it('treats blocks with undeclared (undefined) I/O as having none', () => {
    // input/output are optional on the schema; a parsed block may omit them.
    const c = compositeOf([
      { id: 'a', type: 'text' },
      { id: 'b', type: 'text', input: ['email'] },
    ]);
    expect(deriveCompositeBoundary(c)).toEqual({ input: ['email'], output: [] });
  });
});
