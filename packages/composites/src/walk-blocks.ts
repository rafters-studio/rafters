import type { BindLocals } from './bind';
import type { CompositeBlock } from './manifest';

const MAX_DEPTH = 50;

export type BlockVisitor<T> = (block: CompositeBlock, children: T[]) => T;

function walk<T>(
  block: CompositeBlock,
  blockMap: Map<string, CompositeBlock>,
  visitor: BlockVisitor<T>,
  visited: Set<string>,
  depth: number,
): T | null {
  if (depth > MAX_DEPTH || visited.has(block.id)) return null;
  visited.add(block.id);

  const childResults: T[] = [];
  if (block.children) {
    for (const childId of block.children) {
      const child = blockMap.get(childId);
      if (!child) continue;
      const result = walk(child, blockMap, visitor, visited, depth + 1);
      if (result !== null) childResults.push(result);
    }
  }

  return visitor(block, childResults);
}

export function walkBlocks<T>(
  blocks: CompositeBlock[],
  visitor: BlockVisitor<T>,
  join: (results: T[]) => T,
): T {
  const blockMap = new Map<string, CompositeBlock>();
  for (const block of blocks) blockMap.set(block.id, block);

  const results: T[] = [];
  for (const block of blocks) {
    if (block.parentId) continue;
    const result = walk(block, blockMap, visitor, new Set(), 0);
    if (result !== null) results.push(result);
  }

  return join(results);
}

export interface BlockScope {
  /** Block id, plus `:<index>` for each enclosing `each` copy, outermost first. */
  key: string;
  /** Item names bound by enclosing `each`/`as` blocks (inner names shadow outer ones). */
  locals: BindLocals;
}

export type ScopedBlockVisitor<T> = (block: CompositeBlock, children: T[], scope: BlockScope) => T;

/** Resolve a block's `each` binding in the given locals; return undefined when unresolved. */
export type EachResolver = (block: CompositeBlock, locals: BindLocals) => unknown;

interface ScopedWalk<T> {
  blockMap: Map<string, CompositeBlock>;
  visitor: ScopedBlockVisitor<T>;
  resolveEach: EachResolver;
  /** Scoped keys already rendered under the current root. */
  visited: Set<string>;
  /** Ids of the blocks on the path from the root to the current block. */
  ancestors: Set<string>;
}

function walkScoped<T>(
  block: CompositeBlock,
  state: ScopedWalk<T>,
  suffix: string,
  locals: BindLocals,
  depth: number,
): T[] {
  const baseKey = block.id + suffix;
  if (depth > MAX_DEPTH || state.visited.has(baseKey) || state.ancestors.has(block.id)) return [];
  state.visited.add(baseKey);

  if (block.each === undefined || block.as === undefined) {
    return [renderScoped(block, state, suffix, locals, depth)];
  }

  const items = state.resolveEach(block, locals);
  if (items === undefined || items === null) return [];
  if (!Array.isArray(items)) {
    throw new Error(`Invalid each in block "${block.id}": expected an array, got ${typeof items}`);
  }

  const name = block.as;
  return items.map((item: unknown, index) =>
    renderScoped(block, state, `${suffix}:${index}`, { ...locals, [name]: item }, depth),
  );
}

function renderScoped<T>(
  block: CompositeBlock,
  state: ScopedWalk<T>,
  suffix: string,
  locals: BindLocals,
  depth: number,
): T {
  const childResults: T[] = [];
  if (block.children) {
    state.ancestors.add(block.id);
    for (const childId of block.children) {
      const child = state.blockMap.get(childId);
      if (!child) continue;
      childResults.push(...walkScoped(child, state, suffix, locals, depth + 1));
    }
    state.ancestors.delete(block.id);
  }
  return state.visitor(block, childResults, { key: block.id + suffix, locals });
}

/**
 * Like `walkBlocks`, but renders a block with `each`/`as` once per item of the
 * array `resolveEach` returns, in order. The copies take the block's place among
 * its parent's children (or become separate roots). Each copy binds its item
 * under the `as` name in `scope.locals`, and its key and every descendant key
 * gain the suffix `:<index>`. A block never renders under itself.
 */
export function walkScopedBlocks<T>(
  blocks: CompositeBlock[],
  visitor: ScopedBlockVisitor<T>,
  join: (results: T[]) => T,
  resolveEach: EachResolver,
): T {
  const blockMap = new Map<string, CompositeBlock>();
  for (const block of blocks) blockMap.set(block.id, block);

  const results: T[] = [];
  for (const block of blocks) {
    if (block.parentId) continue;
    const state: ScopedWalk<T> = {
      blockMap,
      visitor,
      resolveEach,
      visited: new Set(),
      ancestors: new Set(),
    };
    results.push(...walkScoped(block, state, '', {}, 0));
  }

  return join(results);
}

export function kebabToPascal(kebab: string): string {
  const sanitized = kebab.replace(/[^a-zA-Z0-9-]/g, '');
  const parts = sanitized.split('-').filter((p) => p.length > 0);
  if (parts.length === 0) return '';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
