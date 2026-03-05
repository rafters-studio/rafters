/**
 * Bridge utilities
 *
 * Converts CompositeFile manifests into BlockPaletteItem objects
 * for the editor sidebar.
 */

import type { BlockPaletteItem } from '@rafters/ui/primitives/block-palette';
import type { CompositeFile } from './manifest.js';

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
