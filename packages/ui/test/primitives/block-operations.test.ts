import { describe, expect, it } from 'vitest';
import {
  blockContentToText,
  convertBlockType,
  deleteBlock,
  insertBlocksAt,
  mergeWithNext,
  mergeWithPrevious,
  splitBlock,
} from '../../src/primitives/block-operations';
import type { BaseBlock } from '../../src/primitives/types';

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
    const result = splitBlock(blocks, 'p1', 5, 'new-1');
    expect(result.blocks).toHaveLength(5);
    expect(result.blocks[1].content).toBe('Hello');
    expect(result.blocks[2].content).toBe(' world');
    expect(result.blocks[2].type).toBe('text');
    expect(result.newBlockId).toBe('new-1');
    expect(result.blocks[2].id).toBe('new-1');
  });

  it('splits at the start (offset 0)', () => {
    const result = splitBlock(blocks, 'p1', 0, 'new-2');
    expect(result.blocks[1].content).toBe('');
    expect(result.blocks[2].content).toBe('Hello world');
  });

  it('splits at the end', () => {
    const result = splitBlock(blocks, 'p1', 11, 'new-3');
    expect(result.blocks[1].content).toBe('Hello world');
    expect(result.blocks[2].content).toBe('');
  });

  it('a heading split in the middle clones the heading, level included', () => {
    const result = splitBlock(blocks, 'h1', 2, 'new-4');
    expect(result.blocks[0]).toEqual({
      id: 'h1',
      type: 'heading',
      content: 'Ti',
      meta: { level: 1 },
    });
    expect(result.blocks[1]).toEqual({
      id: 'new-4',
      type: 'heading',
      content: 'tle',
      meta: { level: 1 },
    });
  });

  it('a heading split at its end gives an empty paragraph with no meta', () => {
    const result = splitBlock(blocks, 'h1', 5, 'new-8');
    expect(result.blocks[0]).toEqual(blocks[0]);
    expect(result.blocks[1]).toEqual({ id: 'new-8', type: 'text', content: '' });
  });

  it('a caller-named type wins and carries no meta', () => {
    const result = splitBlock(blocks, 'h1', 2, 'new-9', 'text');
    expect(result.blocks[1]).toEqual({ id: 'new-9', type: 'text', content: 'tle' });
  });

  it('the clone does not share the meta object with the split block', () => {
    const result = splitBlock(blocks, 'h1', 2, 'new-10');
    expect(result.blocks[1].meta).not.toBe(result.blocks[0].meta);
  });

  it('returns unchanged if block not found', () => {
    const result = splitBlock(blocks, 'nonexistent', 0, 'new-5');
    expect(result.blocks).toBe(blocks);
  });

  it('splits marked InlineContent[] at a run boundary, preserving marks on both halves', () => {
    const marked: BaseBlock[] = [
      {
        id: 'm1',
        type: 'text',
        content: [{ text: 'hello ', marks: ['bold'] }, { text: 'world' }],
      },
    ];
    const result = splitBlock(marked, 'm1', 6, 'new-6');
    expect(result.blocks[0].content).toEqual([{ text: 'hello ', marks: ['bold'] }]);
    expect(result.blocks[1].content).toEqual([{ text: 'world' }]);
  });

  it('splits marked InlineContent[] mid-run, splitting the straddled run', () => {
    const marked: BaseBlock[] = [
      { id: 'm1', type: 'text', content: [{ text: 'hello world', marks: ['bold'] }] },
    ];
    const result = splitBlock(marked, 'm1', 5, 'new-7');
    expect(result.blocks[0].content).toEqual([{ text: 'hello', marks: ['bold'] }]);
    expect(result.blocks[1].content).toEqual([{ text: ' world', marks: ['bold'] }]);
  });

  it('does not mint a crypto.randomUUID internally -- caller-supplied id passes through', () => {
    const result = splitBlock(blocks, 'p1', 5, 'caller-assigned-id');
    expect(result.newBlockId).toBe('caller-assigned-id');
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

  it('preserves marks across the merge point when either side has InlineContent[]', () => {
    const marked: BaseBlock[] = [
      { id: 'm1', type: 'text', content: [{ text: 'hello ', marks: ['bold'] }] },
      { id: 'm2', type: 'text', content: [{ text: 'world' }] },
    ];
    const result = mergeWithPrevious(marked, 'm2');
    expect(result.blocks[0].content).toEqual([
      { text: 'hello ', marks: ['bold'] },
      { text: 'world' },
    ]);
  });

  it('merges adjacent runs with identical marks into one canonical run', () => {
    const marked: BaseBlock[] = [
      { id: 'm1', type: 'text', content: [{ text: 'hello', marks: ['bold'] }] },
      { id: 'm2', type: 'text', content: [{ text: ' world', marks: ['bold'] }] },
    ];
    const result = mergeWithPrevious(marked, 'm2');
    expect(result.blocks[0].content).toEqual([{ text: 'hello world', marks: ['bold'] }]);
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

  it('preserves marks across the merge point when either side has InlineContent[]', () => {
    const marked: BaseBlock[] = [
      { id: 'm1', type: 'text', content: [{ text: 'hello ', marks: ['bold'] }] },
      { id: 'm2', type: 'text', content: [{ text: 'world' }] },
    ];
    const result = mergeWithNext(marked, 'm1');
    expect(result.blocks[0].content).toEqual([
      { text: 'hello ', marks: ['bold'] },
      { text: 'world' },
    ]);
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
    const result = insertBlocksAt(blocks, newBlocks, 'p1', 5, 'p1-split');
    // Original p1 is split: "Hello" | n1 | n2 | " world"
    expect(result.blocks.length).toBeGreaterThan(blocks.length + newBlocks.length - 1);
    expect(result.lastInsertedId).toBe('n2');
    expect(result.blocks.some((b) => b.id === 'p1-split')).toBe(true);
  });

  it("inserting into the middle of a paragraph leaves the paragraph's tail as a paragraph", () => {
    const result = insertBlocksAt(blocks, newBlocks, 'p1', 5, 'p1-split');
    expect(result.blocks.map((b) => b.id)).toEqual([
      'h1',
      'p1',
      'n1',
      'n2',
      'p1-split',
      'p2',
      'q1',
    ]);
    expect(result.blocks[4]).toEqual({ id: 'p1-split', type: 'text', content: ' world' });
  });

  it("inserting into the middle of a heading leaves the heading's tail as a heading", () => {
    const result = insertBlocksAt(blocks, newBlocks, 'h1', 2, 'h1-split');
    expect(result.blocks[3]).toEqual({
      id: 'h1-split',
      type: 'heading',
      content: 'tle',
      meta: { level: 1 },
    });
  });

  it('throws when the middle-of-block branch is reached without a splitBlockId', () => {
    expect(() => insertBlocksAt(blocks, newBlocks, 'p1', 5)).toThrow(/splitBlockId/);
  });

  it('handles empty insert', () => {
    const result = insertBlocksAt(blocks, [], 'p1', 5);
    expect(result.blocks).toBe(blocks);
  });
});
