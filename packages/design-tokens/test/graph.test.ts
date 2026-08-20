import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CircularDependencyError,
  type Plugin,
  TokenGraph,
  UnknownPluginError,
} from '../src/index.js';

const R = { reason: 'test' } as const;

const doublePlugin: Plugin = {
  name: 'double',
  inputSchema: z.object({ source: z.string() }),
  outputSchema: z.number(),
  dependsOn: (input) => [(input as { source: string }).source],
  transform: (input, get) => {
    const v = get((input as { source: string }).source) as number;
    return v * 2;
  },
};

const sumPlugin: Plugin = {
  name: 'sum',
  inputSchema: z.object({ sources: z.array(z.string()) }),
  outputSchema: z.number(),
  dependsOn: (input) => (input as { sources: string[] }).sources,
  transform: (input, get) => {
    const sources = (input as { sources: string[] }).sources;
    return sources.reduce<number>((acc, name) => acc + (get(name) as number), 0);
  },
};

const identityPlugin: Plugin = {
  name: 'identity',
  inputSchema: z.object({ source: z.string() }),
  outputSchema: z.unknown(),
  dependsOn: (input) => [(input as { source: string }).source],
  transform: (input, get) => get((input as { source: string }).source),
};

describe('TokenGraph', () => {
  describe('seed + get', () => {
    it('stores and retrieves leaf values', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      expect(g.get('a')).toBe(1);
    });

    it('overwrites existing value', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      g.seed('a', 5);
      expect(g.get('a')).toBe(5);
    });

    it('returns undefined for unknown name', () => {
      const g = new TokenGraph();
      expect(g.get('nope')).toBeUndefined();
    });
  });

  describe('bind + cascade', () => {
    it('computes initial value via plugin on bind', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 3);
      g.bind('b', 'double', { source: 'a' });
      expect(g.get('b')).toBe(6);
    });

    it('propagates upstream changes through dependents', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 1);
      g.bind('b', 'double', { source: 'a' });
      g.set('a', 5, R);
      expect(g.get('b')).toBe(10);
    });

    it('propagates transitively through multi-hop chains', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 2);
      g.bind('b', 'double', { source: 'a' });
      g.bind('c', 'double', { source: 'b' });
      g.bind('d', 'double', { source: 'c' });
      expect(g.get('d')).toBe(16);
      g.set('a', 3, R);
      expect(g.get('b')).toBe(6);
      expect(g.get('c')).toBe(12);
      expect(g.get('d')).toBe(24);
    });

    it('handles fan-out: many dependents on one source', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 4);
      g.bind('x', 'double', { source: 'a' });
      g.bind('y', 'double', { source: 'a' });
      g.bind('z', 'double', { source: 'a' });
      g.set('a', 10, R);
      expect(g.get('x')).toBe(20);
      expect(g.get('y')).toBe(20);
      expect(g.get('z')).toBe(20);
    });

    it('handles fan-in: dependent reads multiple sources', () => {
      const g = new TokenGraph([sumPlugin]);
      g.seed('a', 1);
      g.seed('b', 2);
      g.seed('c', 3);
      g.bind('total', 'sum', { sources: ['a', 'b', 'c'] });
      expect(g.get('total')).toBe(6);
      g.set('b', 10, R);
      expect(g.get('total')).toBe(14);
    });
  });

  describe('userOverride is the diary entry for every set', () => {
    it('records reason on every set', () => {
      const g = new TokenGraph();
      g.set('a', 1, { reason: 'designer choice' });
      expect(g.node('a')?.userOverride?.reason).toBe('designer choice');
    });

    it('records optional context on userOverride', () => {
      const g = new TokenGraph();
      g.set('a', 1, { reason: 'designer choice', context: 'Q1 brand campaign' });
      expect(g.node('a')?.userOverride?.context).toBe('Q1 brand campaign');
    });

    it('captures previous value on every set', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      g.set('a', 99, { reason: 'override' });
      expect(g.node('a')?.userOverride?.previousValue).toBe(1);
    });

    it('replaces userOverride on subsequent set (latest set wins)', () => {
      const g = new TokenGraph();
      g.set('a', 1, { reason: 'first' });
      g.set('a', 5, { reason: 'second' });
      expect(g.node('a')?.userOverride?.reason).toBe('second');
      expect(g.node('a')?.userOverride?.previousValue).toBe(1);
    });
  });

  describe('userOverride anchors the cascade boundary', () => {
    it('blocks upstream re-derivation on the anchored node', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 2);
      g.bind('b', 'double', { source: 'a' });
      expect(g.get('b')).toBe(4);
      g.set('b', 100, { reason: 'manual' });
      g.set('a', 7, R);
      expect(g.get('b')).toBe(100);
    });

    it('downstream of an anchor still re-derives from the anchor value', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 2);
      g.bind('b', 'double', { source: 'a' });
      g.bind('c', 'double', { source: 'b' });
      g.set('b', 50, { reason: 'manual' });
      expect(g.get('c')).toBe(100);
    });

    it('preserves binding when overriding so cascade can resume on later rebind', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 2);
      g.bind('b', 'double', { source: 'a' });
      g.set('b', 999, { reason: 'manual' });
      expect(g.node('b')?.binding?.plugin).toBe('double');
    });
  });

  describe('undo', () => {
    it('reverses the last set', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      g.set('a', 5, R);
      g.undo();
      expect(g.get('a')).toBe(1);
    });

    it('reverses the last bind including cascade effects', () => {
      const g = new TokenGraph([doublePlugin]);
      g.seed('a', 3);
      g.bind('b', 'double', { source: 'a' });
      g.set('a', 10, R);
      g.undo();
      expect(g.get('a')).toBe(3);
      expect(g.get('b')).toBe(6);
    });

    it('is single-step (does not stack)', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      g.set('a', 5, R);
      g.set('a', 9, R);
      g.undo();
      expect(g.get('a')).toBe(5);
      g.undo();
      expect(g.get('a')).toBe(5);
    });
  });

  describe('cascade atomicity (issue #1626)', () => {
    it('rolls back the whole set when a mid-cascade plugin throws', () => {
      let armed = false;
      const explodingPlugin: Plugin = {
        name: 'exploding',
        inputSchema: z.object({ source: z.string() }),
        outputSchema: z.number(),
        dependsOn: (input) => [(input as { source: string }).source],
        transform: (input, get) => {
          if (armed) throw new Error('plugin blew up');
          return (get((input as { source: string }).source) as number) + 1;
        },
      };
      // a -> b (double, succeeds) -> c (exploding, throws once armed).
      // topoSort recomputes b before c, so b is the "already applied"
      // half of the partial state we're asserting gets rolled back.
      const g = new TokenGraph([doublePlugin, explodingPlugin]);
      g.seed('a', 1);
      g.bind('b', 'double', { source: 'a' });
      g.bind('c', 'exploding', { source: 'b' });
      expect(g.get('a')).toBe(1);
      expect(g.get('b')).toBe(2);
      expect(g.get('c')).toBe(3);

      armed = true;
      expect(() => g.set('a', 5, R)).toThrow('plugin blew up');

      // Nothing half-applied: the direct set on 'a' and the successful
      // recompute of 'b' are both reverted, not just 'c' left stale.
      expect(g.get('a')).toBe(1);
      expect(g.get('b')).toBe(2);
      expect(g.get('c')).toBe(3);

      // The automatic rollback already consumed the snapshot, so a
      // caller-invoked undo() after catching the error is a no-op.
      g.undo();
      expect(g.get('a')).toBe(1);
    });

    it('rolls back a bind whose own cascade throws', () => {
      let armed = false;
      const explodingPlugin: Plugin = {
        name: 'exploding2',
        inputSchema: z.object({ source: z.string() }),
        outputSchema: z.number(),
        dependsOn: (input) => [(input as { source: string }).source],
        transform: (input, get) => {
          if (armed) throw new Error('boom');
          return (get((input as { source: string }).source) as number) + 1;
        },
      };
      const g = new TokenGraph([doublePlugin, explodingPlugin]);
      g.seed('a', 1);
      g.bind('b', 'double', { source: 'a' });
      g.bind('c', 'exploding2', { source: 'b' });

      armed = true;
      // Rebinding 'b' recomputes 'b' itself fine, but cascades into 'c',
      // which throws. The bind of 'b' should not stick.
      expect(() => g.bind('b', 'double', { source: 'a' })).toThrow('boom');
      expect(g.get('b')).toBe(2);
      expect(g.get('c')).toBe(3);
    });

    it('still succeeds normally after a rolled-back cascade failure', () => {
      let armed = false;
      const explodingPlugin: Plugin = {
        name: 'exploding3',
        inputSchema: z.object({ source: z.string() }),
        outputSchema: z.number(),
        dependsOn: (input) => [(input as { source: string }).source],
        transform: (input, get) => {
          if (armed) throw new Error('boom');
          return (get((input as { source: string }).source) as number) + 1;
        },
      };
      const g = new TokenGraph([doublePlugin, explodingPlugin]);
      g.seed('a', 1);
      g.bind('b', 'double', { source: 'a' });
      g.bind('c', 'exploding3', { source: 'b' });

      armed = true;
      expect(() => g.set('a', 5, R)).toThrow('boom');

      armed = false;
      g.set('a', 5, R);
      expect(g.get('a')).toBe(5);
      expect(g.get('b')).toBe(10);
      expect(g.get('c')).toBe(11);
    });
  });

  describe('cycle detection', () => {
    it('throws CircularDependencyError on direct cycle', () => {
      const g = new TokenGraph([identityPlugin]);
      g.seed('a', 1);
      g.seed('b', 2);
      g.bind('a', 'identity', { source: 'b' });
      expect(() => g.bind('b', 'identity', { source: 'a' })).toThrow(CircularDependencyError);
    });

    it('throws CircularDependencyError on transitive cycle', () => {
      const g = new TokenGraph([identityPlugin]);
      g.seed('a', 1);
      g.seed('b', 2);
      g.seed('c', 3);
      g.bind('b', 'identity', { source: 'a' });
      g.bind('c', 'identity', { source: 'b' });
      expect(() => g.bind('a', 'identity', { source: 'c' })).toThrow(CircularDependencyError);
    });

    it('cycle error includes the cycle path', () => {
      const g = new TokenGraph([identityPlugin]);
      g.seed('a', 1);
      g.seed('b', 2);
      g.bind('a', 'identity', { source: 'b' });
      try {
        g.bind('b', 'identity', { source: 'a' });
        expect.fail('should have thrown');
      } catch (e) {
        if (!(e instanceof CircularDependencyError)) throw e;
        expect(e.cycle).toContain('a');
        expect(e.cycle).toContain('b');
      }
    });
  });

  describe('plugin lookup', () => {
    it('throws UnknownPluginError when binding with unregistered plugin', () => {
      const g = new TokenGraph();
      expect(() => g.bind('a', 'nonexistent', {})).toThrow(UnknownPluginError);
    });

    it('accepts plugins registered after construction', () => {
      const g = new TokenGraph();
      g.registerPlugin(doublePlugin);
      g.seed('a', 4);
      g.bind('b', 'double', { source: 'a' });
      expect(g.get('b')).toBe(8);
    });
  });

  describe('inventory', () => {
    it('reports size accurately', () => {
      const g = new TokenGraph();
      expect(g.size()).toBe(0);
      g.seed('a', 1);
      g.seed('b', 2);
      expect(g.size()).toBe(2);
    });

    it('has() reflects presence', () => {
      const g = new TokenGraph();
      g.seed('a', 1);
      expect(g.has('a')).toBe(true);
      expect(g.has('b')).toBe(false);
    });

    it('list() filters by namespace prefix (dash and dot separators)', () => {
      const g = new TokenGraph();
      g.seed('color-primary', 1);
      g.seed('color-secondary', 2);
      g.seed('color.tertiary', 3);
      g.seed('spacing-base', 4);
      const colors = g.list({ namespace: 'color' });
      expect(colors.map((n) => n.name).sort()).toEqual([
        'color-primary',
        'color-secondary',
        'color.tertiary',
      ]);
    });
  });
});
