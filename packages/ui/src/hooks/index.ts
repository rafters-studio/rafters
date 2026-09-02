/**
 * React hooks for editor primitives
 * @module hooks
 */

export type { UseBlockSelectionOptions, UseBlockSelectionReturn } from './use-block-selection';
// R-300: useBlockSelection
export { useBlockSelection } from './use-block-selection';
export type { ClipboardData, UseClipboardOptions, UseClipboardReturn } from './use-clipboard';
// R-302: useClipboard
export { useClipboard } from './use-clipboard';
export type { UseCommandPaletteOptions, UseCommandPaletteReturn } from './use-command-palette';
// R-304: useCommandPalette
export { useCommandPalette } from './use-command-palette';
export type {
  UseDraggableOptions,
  UseDraggableReturn,
  UseDropZoneOptions,
  UseDropZoneReturn,
} from './use-drag-drop';
// R-303: useDragDrop
export { useDraggable, useDropZone } from './use-drag-drop';
// memory bridge: subscribe a component to a createMemory cell
export { useMemory } from './use-memory';
