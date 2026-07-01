/**
 * resizable.test.ts - the panels cell behavior extracted onto createMemory.
 *
 * These cover the state-plumbing invariants the migration must hold: idempotent
 * register-by-id (no StrictMode double-invoke duplicates), sequential writes that do
 * not lose updates, a read-only derived sizes atom, and equality-gated persistence.
 * Drag interaction and visuals are unchanged and exercised in the browser, not here.
 */
import { describe, expect, it } from 'vitest';
import { createMemory } from '../../primitives/memory';
import { sizesEqual } from './resizable';

interface PanelData {
  id: string;
  size: number;
}

describe('resizable panels cell', () => {
  it('idempotent register-by-id: double-invoke yields no duplicate, order stable', () => {
    const m = createMemory<PanelData[]>(() => []);
    const register = (p: PanelData) => m.set([...m.get().filter((x) => x.id !== p.id), p]);
    register({ id: 'a', size: 50 });
    register({ id: 'a', size: 50 }); // StrictMode double-invoke
    register({ id: 'b', size: 50 });
    expect(m.get().map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('sequential register keeps both (nanostores set is immediate, no lost update)', () => {
    const m = createMemory<PanelData[]>(() => []);
    m.set([...m.get(), { id: 'a', size: 50 }]);
    m.set([...m.get(), { id: 'b', size: 50 }]);
    expect(m.get().length).toBe(2);
  });

  it('derive exposes a reactive read-only sizes atom', () => {
    const m = createMemory<PanelData[]>(() => [{ id: 'a', size: 30 }]);
    const sizes = m.derive((list) => list.map((p) => p.size));
    const seen: number[][] = [];
    sizes.subscribe((s) => seen.push(s));
    m.set([{ id: 'a', size: 70 }]);
    expect(seen.at(-1)).toEqual([70]);
  });

  it('persistence subscriber fires only on size change (equality-gated)', () => {
    const m = createMemory<PanelData[]>(() => [{ id: 'a', size: 50 }]);
    const saved: number[][] = [];
    m.select(
      (list) => list.map((p) => p.size),
      (s) => saved.push(s),
      sizesEqual,
    );
    m.set([{ id: 'a', size: 50 }]); // same sizes -> no fire
    m.set([{ id: 'a', size: 60 }]); // changed -> fire
    expect(saved).toEqual([[60]]);
  });
});

describe('sizesEqual', () => {
  it('is true for element-wise equal arrays of equal length', () => {
    expect(sizesEqual([10, 20, 30], [10, 20, 30])).toBe(true);
  });

  it('is false when lengths differ', () => {
    expect(sizesEqual([10, 20], [10, 20, 30])).toBe(false);
  });

  it('is false when any element differs', () => {
    expect(sizesEqual([10, 20, 30], [10, 25, 30])).toBe(false);
  });
});
