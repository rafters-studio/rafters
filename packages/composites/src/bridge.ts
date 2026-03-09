/**
 * Bridge utilities
 *
 * Converts CompositeFile manifests into BlockPaletteItem objects
 * for the editor sidebar, instantiates composite blocks with
 * fresh IDs for canvas insertion, and serializes editor blocks
 * into CompositeFile format.
 */

import type { BlockPaletteItem } from '@rafters/ui/primitives/block-palette';
import type { AppliedRule, CompositeBlock, CompositeCategory, CompositeFile } from './manifest';

/** A block ready for insertion into the editor canvas (same shape as CompositeBlock). */
export type InstantiatedBlock = CompositeBlock;

/** Options for composite block instantiation. */
export interface InstantiateOptions {
  /** Resolve nested `composite:*` block types. Return null if not found. */
  resolveComposite?: (compositeId: string) => CompositeFile | null;
  /** Maximum recursion depth for nested composites (default 10). */
  maxDepth?: number;
}

/** Minimal block shape matching EditorBlock for serialization. */
export interface SerializableBlock {
  id: string;
  type: string;
  content?: unknown;
  children?: string[];
  parentId?: string;
  meta?: Record<string, unknown>;
  rules?: AppliedRule[];
}

/** Metadata collected from the save dialog. */
export interface SaveCompositeMetadata {
  name: string;
  category: CompositeCategory;
  description: string;
  cognitiveLoad?: number;
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
  if (depth >= maxDepth) return [];

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
        if (parentNewId) {
          const parent = result.find((r) => r.id === parentNewId);
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
      const placeholderId = idMap.get(block.id) ?? block.id;
      result.push({
        id: placeholderId,
        type: 'text',
        content: `Unknown composite: ${compositeId}`,
      });
      continue;
    }

    const newId = idMap.get(block.id) ?? block.id;
    const instantiated: InstantiatedBlock = {
      id: newId,
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

/**
 * Convert a display name to a kebab-case ID suitable for composite filenames.
 */
export function toKebabId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derive input/output rule names from a set of blocks.
 *
 * Simple v1 heuristic:
 * - input: all unique rule names from root blocks (no parentId)
 * - output: all unique rule names from leaf blocks (no children or empty children)
 */
function deriveIO(blocks: SerializableBlock[]): { input: string[]; output: string[] } {
  const inputSet = new Set<string>();
  const outputSet = new Set<string>();

  for (const block of blocks) {
    if (!block.rules || block.rules.length === 0) continue;

    const ruleNames = block.rules.map((r) => (typeof r === 'string' ? r : r.name));
    const isRoot = !block.parentId;
    const isLeaf = !block.children || block.children.length === 0;

    if (isRoot) {
      for (const name of ruleNames) inputSet.add(name);
    }
    if (isLeaf) {
      for (const name of ruleNames) outputSet.add(name);
    }
  }

  return {
    input: [...inputSet].sort(),
    output: [...outputSet].sort(),
  };
}

/**
 * Derive keywords from block types and rule names.
 */
function deriveKeywords(blocks: SerializableBlock[]): string[] {
  const keywords = new Set<string>();
  for (const block of blocks) {
    keywords.add(block.type);
    if (block.rules) {
      for (const rule of block.rules) {
        keywords.add(typeof rule === 'string' ? rule : rule.name);
      }
    }
  }
  return [...keywords].sort();
}

/**
 * Serialize editor blocks and metadata into a valid CompositeFile.
 *
 * The consumer provides blocks from the canvas and metadata from a save dialog.
 * This function derives the ID, I/O rules, and keywords automatically.
 */
export function serializeToComposite(
  blocks: SerializableBlock[],
  metadata: SaveCompositeMetadata,
): CompositeFile {
  if (blocks.length === 0) {
    throw new Error('Cannot create a composite with zero blocks.');
  }
  const id = toKebabId(metadata.name);
  if (!id) {
    throw new Error(
      `Cannot derive a valid composite ID from name "${metadata.name}". Name must contain at least one alphanumeric character.`,
    );
  }
  const { input, output } = deriveIO(blocks);
  const keywords = deriveKeywords(blocks);
  const rawLoad = metadata.cognitiveLoad ?? blocks.length;
  const cognitiveLoad = Math.min(10, Math.max(1, rawLoad));

  return {
    manifest: {
      id,
      name: metadata.name,
      category: metadata.category,
      description: metadata.description,
      keywords,
      cognitiveLoad,
    },
    input,
    output,
    blocks: blocks.map((b) => {
      const block: Record<string, unknown> = { id: b.id, type: b.type };
      if (b.content !== undefined) block.content = b.content;
      if (b.children && b.children.length > 0) block.children = b.children;
      if (b.parentId) block.parentId = b.parentId;
      if (b.meta && Object.keys(b.meta).length > 0) block.meta = b.meta;
      if (b.rules && b.rules.length > 0) block.rules = b.rules;
      return block;
    }) as CompositeFile['blocks'],
  };
}
