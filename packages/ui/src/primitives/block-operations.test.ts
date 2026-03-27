import { describe, expect, it } from 'vitest';
import {
  blockContentToText,
  convertBlockType,
  deleteBlock,
  insertBlocksAt,
  mergeWithNext,
  mergeWithPrevious,
  splitBlock,
} from './block-operations';
import type { BaseBlock } from './types';

const blocks: BaseBlock[] = [
  { id: 'h1', type: 'heading', content: 'Title', meta: { level: 1 } },
  { id: 'p1', type: 'text', content: 'Hello world' },
  { id: 'p2', type: 'text', content: 'Second paragraph' },
  { id: 'q1', type: 'quote', content: 'A wise quote' },
];

describe('blockContentToText', () => {
  it('handles string content', () => {
    expect(blockContentToText('hello')).toBe('hello');
  });

  it('handles InlineContent array', () => {
    expect(blockContentToText([{ text: 'hello ' }, { text: 'world', marks: ['bold'] }])).toBe(
      'hello world',
    );
  });

  it('handles undefined', () => {
    expect(blockContentToText(undefined)).toBe('');
  });
});

describe('splitBlock', () => {
  it('splits in the middle', () => {
    const result = splitBlock(blocks, 'p1', 5);
    expect(result.blocks).toHaveLength(5);
    expect(result.blocks[1].content).toBe('Hello');
    expect(result.blocks[2].content).toBe(' world');
    expect(result.blocks[2].type).toBe('text');
    expect(result.newBlockId).toBe(result.blocks[2].id);
  });

  it('splits at the start (offset 0)', () => {
    const result = splitBlock(blocks, 'p1', 0);
    expect(result.blocks[1].content).toBe('');
    expect(result.blocks[2].content).toBe('Hello world');
  });

  it('splits at the end', () => {
    const result = splitBlock(blocks, 'p1', 11);
    expect(result.blocks[1].content).toBe('Hello world');
    expect(result.blocks[2].content).toBe('');
  });

  it('heading split creates text block', () => {
    const result = splitBlock(blocks, 'h1', 2);
    expect(result.blocks[0].type).toBe('heading');
    expect(result.blocks[0].content).toBe('Ti');
    expect(result.blocks[1].type).toBe('text');
    expect(result.blocks[1].content).toBe('tle');
  });

  it('returns unchanged if block not found', () => {
    const result = splitBlock(blocks, 'nonexistent', 0);
    expect(result.blocks).toBe(blocks);
  });
});

describe('mergeWithPrevious', () => {
  it('merges content into previous block', () => {
    const result = mergeWithPrevious(blocks, 'p2');
    expect(result.blocks).toHaveLength(3);
    expect(result.survivorId).toBe('p1');
    expect(result.blocks[1].content).toBe('Hello worldSecond paragraph');
    expect(result.cursorOffset).toBe(11);
  });

  it('no-ops for first block', () => {
    const result = mergeWithPrevious(blocks, 'h1');
    expect(result.blocks).toBe(blocks);
    expect(result.survivorId).toBe('h1');
  });

  it('no-ops for missing block', () => {
    const result = mergeWithPrevious(blocks, 'nonexistent');
    expect(result.blocks).toBe(blocks);
  });
});

describe('mergeWithNext', () => {
  it('merges next block content into current', () => {
    const result = mergeWithNext(blocks, 'p1');
    expect(result.blocks).toHaveLength(3);
    expect(result.survivorId).toBe('p1');
    expect(result.blocks[1].content).toBe('Hello worldSecond paragraph');
    expect(result.cursorOffset).toBe(11);
  });

  it('no-ops for last block', () => {
    const result = mergeWithNext(blocks, 'q1');
    expect(result.blocks).toBe(blocks);
  });
});

describe('deleteBlock', () => {
  it('deletes and focuses previous', () => {
    const result = deleteBlock(blocks, 'p2');
    expect(result.blocks).toHaveLength(3);
    expect(result.focusBlockId).toBe('p1');
    expect(result.focusAtEnd).toBe(true);
  });

  it('deletes first and focuses next', () => {
    const result = deleteBlock(blocks, 'h1');
    expect(result.blocks).toHaveLength(3);
    expect(result.focusBlockId).toBe('p1');
    expect(result.focusAtEnd).toBe(false);
  });

  it('returns null focus when deleting last block', () => {
    const single: BaseBlock[] = [{ id: 'only', type: 'text', content: 'alone' }];
    const result = deleteBlock(single, 'only');
    expect(result.blocks).toHaveLength(0);
    expect(result.focusBlockId).toBe(null);
  });
});

describe('convertBlockType', () => {
  it('converts text to heading', () => {
    const result = convertBlockType(blocks, 'p1', 'heading', { level: 2 });
    const block = result.find((b) => b.id === 'p1');
    expect(block?.type).toBe('heading');
    expect(block?.meta?.level).toBe(2);
    expect(block?.content).toBe('Hello world');
  });

  it('converts heading to text and removes level meta', () => {
    const result = convertBlockType(blocks, 'h1', 'text');
    const block = result.find((b) => b.id === 'h1');
    expect(block?.type).toBe('text');
    expect(block?.meta?.level).toBeUndefined();
    expect(block?.content).toBe('Title');
  });

  it('converts to code and flattens InlineContent', () => {
    const richBlocks: BaseBlock[] = [
      {
        id: 'r1',
        type: 'text',
        content: [{ text: 'hello ' }, { text: 'bold', marks: ['bold'] }],
      },
    ];
    const result = convertBlockType(richBlocks, 'r1', 'code');
    expect(result[0].content).toBe('hello bold');
  });

  it('does not modify other blocks', () => {
    const result = convertBlockType(blocks, 'p1', 'heading', { level: 3 });
    expect(result.find((b) => b.id === 'h1')?.type).toBe('heading');
    expect(result.find((b) => b.id === 'p2')?.type).toBe('text');
  });
});

describe('insertBlocksAt', () => {
  const newBlocks: BaseBlock[] = [
    { id: 'n1', type: 'text', content: 'Inserted 1' },
    { id: 'n2', type: 'text', content: 'Inserted 2' },
  ];

  it('inserts at end of block', () => {
    const result = insertBlocksAt(blocks, newBlocks, 'p1', 11);
    expect(result.blocks).toHaveLength(6);
    expect(result.blocks[2].id).toBe('n1');
    expect(result.blocks[3].id).toBe('n2');
    expect(result.lastInsertedId).toBe('n2');
  });

  it('inserts at start of block', () => {
    const result = insertBlocksAt(blocks, newBlocks, 'p1', 0);
    expect(result.blocks).toHaveLength(6);
    expect(result.blocks[1].id).toBe('n1');
    expect(result.blocks[2].id).toBe('n2');
  });

  it('splits block and inserts in the middle', () => {
    const result = insertBlocksAt(blocks, newBlocks, 'p1', 5);
    // Original p1 is split: "Hello" | n1 | n2 | " world"
    expect(result.blocks.length).toBeGreaterThan(blocks.length + newBlocks.length - 1);
    expect(result.lastInsertedId).toBe('n2');
  });

  it('handles empty insert', () => {
    const result = insertBlocksAt(blocks, [], 'p1', 5);
    expect(result.blocks).toBe(blocks);
  });
});
