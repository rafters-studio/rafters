/**
 * Bridge utilities
 *
 * Converts CompositeFile manifests into BlockPaletteItem objects
 * for the editor sidebar, and instantiates composite blocks with
 * fresh IDs for canvas insertion.
 */

import type { BlockPaletteItem } from '@rafters/ui/primitives/block-palette';
import type { CompositeBlock, CompositeFile } from './manifest';

/** A block ready for insertion into the editor canvas. */
export interface InstantiatedBlock {
  id: string;
  type: string;
  content?: unknown;
  children?: string[];
  parentId?: string;
  meta?: Record<string, unknown>;
  rules?: CompositeBlock['rules'];
}

/** Options for composite block instantiation. */
export interface InstantiateOptions {
  /** Resolve nested `composite:*` block types. Return null if not found. */
  resolveComposite?: (compositeId: string) => CompositeFile | null;
  /** Maximum recursion depth for nested composites (default 10). */
  maxDepth?: number;
}

/**
 * Convert a CompositeFile manifest into a BlockPaletteItem for the editor sidebar.
 */
export function toBridgeItem(composite: CompositeFile): BlockPaletteItem {
  const { id, name, category, keywords } = composite.manifest;
  const item: BlockPaletteItem = { id, label: name, category };
  if (keywords.length > 0) {
    item.keywords = keywords;
  }
  return item;
}

/**
 * Convert multiple CompositeFiles into a sorted BlockPaletteItem array.
 * Sorted alphabetically by label.
 */
export function toBridgeItems(composites: CompositeFile[]): BlockPaletteItem[] {
  return composites.map(toBridgeItem).sort((a, b) => a.label.localeCompare(b.label));
}

const COMPOSITE_PREFIX = 'composite:';

/**
 * Instantiate composite blocks with fresh IDs and remapped cross-references.
 *
 * Template block IDs are replaced with crypto.randomUUID() values.
 * `children` and `parentId` references are remapped to the new IDs.
 * Blocks with `composite:*` types are recursively expanded if a
 * `resolveComposite` callback is provided.
 */
export function instantiateBlocks(
  blocks: CompositeBlock[],
  options: InstantiateOptions = {},
): InstantiatedBlock[] {
  return expandBlocks(blocks, options, 0);
}

function expandBlocks(
  blocks: CompositeBlock[],
  options: InstantiateOptions,
  depth: number,
): InstantiatedBlock[] {
  const maxDepth = options.maxDepth ?? 10;
  if (depth > maxDepth) return [];

  // Build old-ID -> new-ID map
  const idMap = new Map<string, string>();
  for (const block of blocks) {
    idMap.set(block.id, crypto.randomUUID());
  }

  const result: InstantiatedBlock[] = [];

  for (const block of blocks) {
    // Check for nested composite expansion
    if (block.type.startsWith(COMPOSITE_PREFIX) && options.resolveComposite) {
      const compositeId = block.type.slice(COMPOSITE_PREFIX.length);
      const nested = options.resolveComposite(compositeId);
      if (nested) {
        const expanded = expandBlocks(nested.blocks, options, depth + 1);
        // Remap: if the nested composite's blocks had a parentId pointing to
        // the composite placeholder, update them to point to this block's parent
        const parentNewId = block.parentId ? idMap.get(block.parentId) : undefined;
        for (const eb of expanded) {
          if (!eb.parentId && parentNewId) {
            eb.parentId = parentNewId;
          }
          result.push(eb);
        }
        // Update parent's children: replace the composite placeholder ID
        // with the top-level IDs of the expanded blocks
        const topLevelIds = expanded
          .filter((eb) => !eb.parentId || eb.parentId === parentNewId)
          .map((eb) => eb.id);
        const newParentId = block.parentId ? idMap.get(block.parentId) : undefined;
        if (newParentId) {
          const parent = result.find((r) => r.id === newParentId);
          if (parent?.children) {
            const placeholderId = idMap.get(block.id);
            if (placeholderId) {
              const idx = parent.children.indexOf(placeholderId);
              if (idx !== -1) {
                parent.children.splice(idx, 1, ...topLevelIds);
              }
            }
          }
        }
        continue;
      }
      // Composite not found -- fall through to create a placeholder
      result.push({
        id: idMap.get(block.id) as string,
        type: 'text',
        content: `Unknown composite: ${compositeId}`,
      });
      continue;
    }

    const instantiated: InstantiatedBlock = {
      id: idMap.get(block.id) as string,
      type: block.type,
    };

    if (block.content !== undefined) instantiated.content = block.content;
    if (block.meta) instantiated.meta = { ...block.meta };
    if (block.rules) instantiated.rules = [...block.rules];

    if (block.children) {
      instantiated.children = block.children.map((childId) => idMap.get(childId) ?? childId);
    }
    if (block.parentId) {
      instantiated.parentId = idMap.get(block.parentId) ?? block.parentId;
    }

    result.push(instantiated);
  }

  return result;
}
