/**
 * Block operations primitive - pure functions for structural block mutations
 *
 * Split, merge, convert, insert, and delete operations on a block array.
 * No DOM, no side effects, no external dependencies. These are the building
 * blocks for Enter/Backspace/Delete/paste behavior in a document editor.
 *
 * @registry-name block-operations
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/block-operations.ts
 * @registry-type registry:primitive
 *
 * @dependencies none
 */
import type { BaseBlock, InlineContent } from './types';

// =============================================================================
// Content helpers
// =============================================================================

/** Extract plain text from block content */
export function blockContentToText(content: string | InlineContent[] | undefined): string {
  if (content === undefined) return '';
  if (typeof content === 'string') return content;
  return content.map((s) => s.text).join('');
}

/** Create a new block ID */
function newId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// Split: Enter pressed in the middle of a block
// =============================================================================

export interface SplitResult {
  /** Updated blocks array */
  blocks: BaseBlock[];
  /** ID of the new block (the second half) */
  newBlockId: string;
}

/**
 * Split a block at a text offset. The block keeps content before the offset,
 * a new text block gets content after the offset.
 *
 * If offset is 0: the current block becomes empty, new block gets all content.
 * If offset is at end: current block keeps all content, new empty block created.
 * Headings always create a text block after (not another heading).
 */
export function splitBlock(blocks: BaseBlock[], blockId: string, offset: number): SplitResult {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return { blocks, newBlockId: '' };

  const block = blocks[index];
  if (!block) return { blocks, newBlockId: '' };

  const text = blockContentToText(block.content);
  const before = text.slice(0, offset);
  const after = text.slice(offset);

  const newBlockId = newId();

  // The new block is always a text block (even after headings)
  const newBlock: BaseBlock = {
    id: newBlockId,
    type: 'text',
    content: after,
  };

  const updatedBlock: BaseBlock = {
    ...block,
    content: before,
  };

  const next = [...blocks];
  next[index] = updatedBlock;
  next.splice(index + 1, 0, newBlock);

  return { blocks: next, newBlockId };
}

// =============================================================================
// Merge: Backspace at start or Delete at end
// =============================================================================

export interface MergeResult {
  /** Updated blocks array */
  blocks: BaseBlock[];
  /** ID of the surviving block */
  survivorId: string;
  /** Cursor offset in the surviving block (where the merge point is) */
  cursorOffset: number;
}

/**
 * Merge a block with the previous block. The previous block absorbs the
 * content of the current block. The current block is deleted.
 */
export function mergeWithPrevious(blocks: BaseBlock[], blockId: string): MergeResult {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index <= 0) return { blocks, survivorId: blockId, cursorOffset: 0 };

  const prevBlock = blocks[index - 1];
  const currentBlock = blocks[index];
  if (!prevBlock || !currentBlock) return { blocks, survivorId: blockId, cursorOffset: 0 };

  const prevText = blockContentToText(prevBlock.content);
  const currentText = blockContentToText(currentBlock.content);
  const cursorOffset = prevText.length;

  const merged: BaseBlock = {
    ...prevBlock,
    content: prevText + currentText,
  };

  const next = [...blocks];
  next[index - 1] = merged;
  next.splice(index, 1);

  return { blocks: next, survivorId: prevBlock.id, cursorOffset };
}

/**
 * Merge a block with the next block. The current block absorbs the content
 * of the next block. The next block is deleted.
 */
export function mergeWithNext(blocks: BaseBlock[], blockId: string): MergeResult {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1 || index >= blocks.length - 1) {
    return { blocks, survivorId: blockId, cursorOffset: 0 };
  }

  const currentBlock = blocks[index];
  const nextBlock = blocks[index + 1];
  if (!currentBlock || !nextBlock) {
    return { blocks, survivorId: blockId, cursorOffset: 0 };
  }

  const currentText = blockContentToText(currentBlock.content);
  const nextText = blockContentToText(nextBlock.content);
  const cursorOffset = currentText.length;

  const merged: BaseBlock = {
    ...currentBlock,
    content: currentText + nextText,
  };

  const next = [...blocks];
  next[index] = merged;
  next.splice(index + 1, 1);

  return { blocks: next, survivorId: currentBlock.id, cursorOffset };
}

// =============================================================================
// Delete: remove a block
// =============================================================================

export interface DeleteResult {
  /** Updated blocks array */
  blocks: BaseBlock[];
  /** ID of the block to focus after deletion */
  focusBlockId: string | null;
  /** Whether to place cursor at end of the focus block */
  focusAtEnd: boolean;
}

/**
 * Delete a block from the array. Returns the block to focus after deletion
 * (the previous block, or the next, or null if the array is now empty).
 */
export function deleteBlock(blocks: BaseBlock[], blockId: string): DeleteResult {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return { blocks, focusBlockId: null, focusAtEnd: false };

  const next = blocks.filter((b) => b.id !== blockId);

  // Focus the previous block (at end), or next block (at start), or null
  let focusBlockId: string | null = null;
  let focusAtEnd = false;
  const prevBlock = index > 0 ? next[index - 1] : undefined;
  const nextBlock = next[index];
  if (prevBlock) {
    focusBlockId = prevBlock.id;
    focusAtEnd = true;
  } else if (nextBlock) {
    focusBlockId = nextBlock.id;
    focusAtEnd = false;
  }

  return { blocks: next, focusBlockId, focusAtEnd };
}

// =============================================================================
// Convert: change block type
// =============================================================================

/**
 * Change a block's type, preserving its content. For certain conversions,
 * content is transformed (e.g., code blocks strip marks).
 */
export function convertBlockType(
  blocks: BaseBlock[],
  blockId: string,
  newType: string,
  meta?: Record<string, unknown>,
): BaseBlock[] {
  return blocks.map((b) => {
    if (b.id !== blockId) return b;

    const updated: BaseBlock = {
      ...b,
      type: newType,
    };

    if (meta) {
      updated.meta = { ...b.meta, ...meta };
    } else if (newType === 'text' && b.meta) {
      // When converting to text, remove type-specific meta (level, etc.)
      const { level: _, ...rest } = b.meta as Record<string, unknown> & { level?: number };
      if (Object.keys(rest).length > 0) {
        updated.meta = rest;
      } else {
        delete (updated as unknown as Record<string, unknown>).meta;
      }
    }

    // Code blocks: flatten content to plain text
    if (newType === 'code' && Array.isArray(b.content)) {
      updated.content = blockContentToText(b.content);
    }

    return updated;
  });
}

// =============================================================================
// Insert: paste blocks at a position
// =============================================================================

export interface InsertResult {
  /** Updated blocks array */
  blocks: BaseBlock[];
  /** ID of the last inserted block (for cursor placement) */
  lastInsertedId: string;
}

/**
 * Insert blocks at a position. If the cursor is in the middle of a block,
 * that block is split first and the new blocks are inserted between the halves.
 */
export function insertBlocksAt(
  blocks: BaseBlock[],
  newBlocks: BaseBlock[],
  atBlockId: string,
  atOffset: number,
): InsertResult {
  if (newBlocks.length === 0) return { blocks, lastInsertedId: atBlockId };

  const lastInserted = newBlocks[newBlocks.length - 1];
  if (!lastInserted) return { blocks, lastInsertedId: atBlockId };

  const index = blocks.findIndex((b) => b.id === atBlockId);
  if (index === -1) return { blocks, lastInsertedId: lastInserted.id };

  const block = blocks[index];
  if (!block) return { blocks, lastInsertedId: lastInserted.id };

  const text = blockContentToText(block.content);

  // If at the very end, just insert after
  if (atOffset >= text.length) {
    const next = [...blocks];
    next.splice(index + 1, 0, ...newBlocks);
    return { blocks: next, lastInsertedId: lastInserted.id };
  }

  // If at the very start, insert before
  if (atOffset === 0) {
    const next = [...blocks];
    next.splice(index, 0, ...newBlocks);
    return { blocks: next, lastInsertedId: lastInserted.id };
  }

  // In the middle: split the block and insert between halves
  const { blocks: splitBlocks, newBlockId } = splitBlock(blocks, atBlockId, atOffset);
  const splitIndex = splitBlocks.findIndex((b) => b.id === newBlockId);
  if (splitIndex === -1) return { blocks: splitBlocks, lastInsertedId: lastInserted.id };

  // Insert new blocks before the second half
  const next = [...splitBlocks];
  next.splice(splitIndex, 0, ...newBlocks);
  return { blocks: next, lastInsertedId: lastInserted.id };
}
