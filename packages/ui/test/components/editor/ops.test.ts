import { describe, expect, it } from 'vitest';
import { applyOp, applyOpSequence } from '../../../src/components/editor/ops';
import type {
  EditorOp,
  FormatOp,
  StructuralOp,
  TextOp,
} from '../../../src/components/editor/ops/types';
import type { BaseBlock } from '../../../src/primitives/types';

function applyThenInverse(blocks: BaseBlock[], op: EditorOp): BaseBlock[] {
  const first = applyOp(blocks, op);
  return applyOpSequence(first.blocks, first.inverse);
}

describe('structural ops', () => {
  it('split/merge round-trip, plain text, reusing the pre-assigned id', () => {
    const blocks: BaseBlock[] = [{ id: 'a', type: 'text', content: 'hello world' }];
    const splitOp: StructuralOp = { kind: 'split', blockId: 'a', offset: 5, newBlockId: 'b' };
    expect(applyThenInverse(blocks, splitOp)).toEqual(blocks);
    expect(applyOp(blocks, splitOp).blocks[1]?.id).toBe('b'); // no crypto.randomUUID mint
  });

  it('split/merge round-trip, marked content', () => {
    const markedBlocks: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'hello ', marks: ['bold'] }, { text: 'world' }] },
    ];
    expect(
      applyThenInverse(markedBlocks, { kind: 'split', blockId: 'a', offset: 6, newBlockId: 'b' }),
    ).toEqual(markedBlocks);
  });

  it('mergePrev round-trip where both sides carry marks', () => {
    const bothMarked: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'hello ', marks: ['bold'] }] },
      {
        id: 'b',
        type: 'heading',
        content: [{ text: 'Title', marks: ['italic'] }],
        meta: { level: 2 },
      },
    ];
    expect(applyThenInverse(bothMarked, { kind: 'mergePrev', blockId: 'b' })).toEqual(bothMarked);
  });

  it('mergePrev round-trip with a plain-string survivor and a marked absorbed block (the case the PRESERVE amendment is about)', () => {
    const mixed: BaseBlock[] = [
      { id: 'a', type: 'text', content: 'before ' },
      { id: 'b', type: 'text', content: [{ text: 'Bold', marks: ['bold'] }] },
    ];
    expect(applyThenInverse(mixed, { kind: 'mergePrev', blockId: 'b' })).toEqual(mixed);
  });

  it('mergePrev round-trip across differently-typed blocks (2-element inverse)', () => {
    const withHeading: BaseBlock[] = [
      { id: 'a', type: 'text', content: 'before ' },
      { id: 'b', type: 'heading', content: 'Title', meta: { level: 2 } },
    ];
    const mergeResult = applyOp(withHeading, { kind: 'mergePrev', blockId: 'b' });
    expect(mergeResult.inverse).toHaveLength(2); // removeText + insert
    expect(applyOpSequence(mergeResult.blocks, mergeResult.inverse)).toEqual(withHeading);
  });

  it('mergeNext round-trip where both sides carry marks', () => {
    const bothMarked: BaseBlock[] = [
      {
        id: 'a',
        type: 'heading',
        content: [{ text: 'Title', marks: ['italic'] }],
        meta: { level: 2 },
      },
      { id: 'b', type: 'text', content: [{ text: ' more', marks: ['bold'] }] },
    ];
    expect(applyThenInverse(bothMarked, { kind: 'mergeNext', blockId: 'a' })).toEqual(bothMarked);
  });

  it('mergeNext round-trip across differently-typed blocks (2-element inverse)', () => {
    const withHeading: BaseBlock[] = [
      { id: 'a', type: 'heading', content: 'Title', meta: { level: 2 } },
      { id: 'b', type: 'text', content: ' and more' },
    ];
    const mergeResult = applyOp(withHeading, { kind: 'mergeNext', blockId: 'a' });
    expect(mergeResult.inverse).toHaveLength(2);
    expect(applyOpSequence(mergeResult.blocks, mergeResult.inverse)).toEqual(withHeading);
  });

  it('mergePrev into an EMPTY previous block round-trips (insert lands after, not before)', () => {
    const withEmptyPrev: BaseBlock[] = [
      { id: 'a', type: 'text', content: '' },
      { id: 'b', type: 'heading', content: 'Title', meta: { level: 2 } },
    ];
    expect(applyThenInverse(withEmptyPrev, { kind: 'mergePrev', blockId: 'b' })).toEqual(
      withEmptyPrev,
    );
  });

  it('delete/insert round-trip preserves type + meta', () => {
    const withHeading: BaseBlock[] = [
      { id: 'a', type: 'text', content: 'before ' },
      { id: 'b', type: 'heading', content: 'Title', meta: { level: 2 } },
    ];
    expect(applyThenInverse(withHeading, { kind: 'delete', blockId: 'b' })).toEqual(withHeading);
  });

  it('delete of the first block round-trips, anchoring the inverse insert on the next block', () => {
    const withHeading: BaseBlock[] = [
      { id: 'a', type: 'heading', content: 'Title', meta: { level: 2 } },
      { id: 'b', type: 'text', content: 'after' },
    ];
    expect(applyThenInverse(withHeading, { kind: 'delete', blockId: 'a' })).toEqual(withHeading);
  });

  it('convert round-trip through code restores marks', () => {
    const boldBlock: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'bold', marks: ['bold'] }] },
    ];
    const toCode = applyOp(boldBlock, { kind: 'convert', blockId: 'a', newType: 'code' });
    expect(toCode.blocks[0]?.content).toBe('bold'); // lossy forward conversion, by design
    expect(applyOpSequence(toCode.blocks, toCode.inverse)).toEqual(boldBlock);
  });

  it('convert round-trip on plain-string content stays plain-string (no gratuitous upgrade)', () => {
    const textBlock: BaseBlock[] = [{ id: 'a', type: 'text', content: 'hello world' }];
    const toHeading = applyOp(textBlock, {
      kind: 'convert',
      blockId: 'a',
      newType: 'heading',
      meta: { level: 2 },
    });
    expect(applyOpSequence(toHeading.blocks, toHeading.inverse)).toEqual(textBlock);
  });

  it('insert at a mid-block offset round-trips via its multi-element inverse (deletes + trailing merge)', () => {
    const single: BaseBlock[] = [{ id: 'a', type: 'text', content: 'helloworld' }];
    const insertOp: StructuralOp = {
      kind: 'insert',
      blocks: [{ id: 'x', type: 'text', content: 'NEW' }],
      atBlockId: 'a',
      atOffset: 5,
      splitBlockId: 'a-split',
    };
    const result = applyOp(single, insertOp);
    expect(result.inverse).toHaveLength(2); // delete(x) + mergeNext(a)
    expect(applyThenInverse(single, insertOp)).toEqual(single);
  });

  it('boundary insert (no split) round-trips via delete-only inverse', () => {
    const single: BaseBlock[] = [{ id: 'a', type: 'text', content: 'hello' }];
    const insertOp: StructuralOp = {
      kind: 'insert',
      blocks: [{ id: 'x', type: 'text', content: 'NEW' }],
      atBlockId: 'a',
      atOffset: 5,
    };
    const result = applyOp(single, insertOp);
    expect(result.inverse).toEqual([{ kind: 'delete', blockId: 'x' }]);
    expect(applyThenInverse(single, insertOp)).toEqual(single);
  });

  it('inserting zero blocks at a mid-block offset is a no-op with an empty inverse (no spurious mergeNext)', () => {
    const single: BaseBlock[] = [{ id: 'a', type: 'text', content: 'helloworld' }];
    const result = applyOp(single, { kind: 'insert', blocks: [], atBlockId: 'a', atOffset: 5 });
    expect(result.blocks).toEqual(single);
    expect(result.inverse).toEqual([]);
  });

  it('insert into the middle throws without a splitBlockId', () => {
    const single: BaseBlock[] = [{ id: 'a', type: 'text', content: 'helloworld' }];
    expect(() =>
      applyOp(single, {
        kind: 'insert',
        blocks: [{ id: 'x', type: 'text', content: 'NEW' }],
        atBlockId: 'a',
        atOffset: 5,
      }),
    ).toThrow(/splitBlockId/);
  });
});

describe('format ops', () => {
  it('applyMark/removeMark round-trip over a partially-marked range', () => {
    const partial: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'foo', marks: ['bold'] }, { text: 'bar' }] },
    ];
    const markOp: FormatOp = { kind: 'applyMark', blockId: 'a', start: 0, end: 6, mark: 'bold' };
    expect(applyThenInverse(partial, markOp)).toEqual(partial);
  });

  it('applyMark inverse is one removeMark per disjoint unmarked sub-range', () => {
    const partial: BaseBlock[] = [
      {
        id: 'a',
        type: 'text',
        content: [
          { text: 'a', marks: ['bold'] },
          { text: 'b' },
          { text: 'c', marks: ['bold'] },
          { text: 'd' },
        ],
      },
    ];
    const result = applyOp(partial, {
      kind: 'applyMark',
      blockId: 'a',
      start: 0,
      end: 4,
      mark: 'bold',
    });
    expect(result.inverse).toEqual([
      { kind: 'removeMark', blockId: 'a', start: 1, end: 2, mark: 'bold' },
      { kind: 'removeMark', blockId: 'a', start: 3, end: 4, mark: 'bold' },
    ]);
    expect(applyOpSequence(result.blocks, result.inverse)).toEqual(partial);
  });

  it('applyMark/removeMark round-trip preserves href on the link mark', () => {
    const linked: BaseBlock[] = [{ id: 'a', type: 'text', content: [{ text: 'a link' }] }];
    const markOp: FormatOp = {
      kind: 'applyMark',
      blockId: 'a',
      start: 0,
      end: 6,
      mark: 'link',
      href: 'https://example.com',
    };
    const applied = applyOp(linked, markOp);
    expect(applied.blocks[0]?.content).toEqual([
      { text: 'a link', marks: ['link'], href: 'https://example.com' },
    ]);
    expect(applyOpSequence(applied.blocks, applied.inverse)).toEqual(linked);

    // removeMark's own inverse (applyMark) must also restore href
    const removed = applyOp(applied.blocks, {
      kind: 'removeMark',
      blockId: 'a',
      start: 0,
      end: 6,
      mark: 'link',
    });
    expect(applyOpSequence(removed.blocks, removed.inverse)).toEqual(applied.blocks);
  });

  it('applyMark on an already-fully-marked range produces an empty inverse (no-op undo)', () => {
    const bold: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'bold', marks: ['bold'] }] },
    ];
    const result = applyOp(bold, {
      kind: 'applyMark',
      blockId: 'a',
      start: 0,
      end: 4,
      mark: 'bold',
    });
    expect(result.inverse).toEqual([]);
  });

  it('applyMark throws on an out-of-bounds range', () => {
    const blocks: BaseBlock[] = [{ id: 'a', type: 'text', content: 'hi' }];
    expect(() =>
      applyOp(blocks, { kind: 'applyMark', blockId: 'a', start: 0, end: 10, mark: 'bold' }),
    ).toThrow(/applyMark/);
  });
});

describe('text ops', () => {
  it('removeText/insertText round-trip preserves marks on the restored slice', () => {
    const withRun: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'bold text', marks: ['bold'] }] },
    ];
    const delOp: TextOp = {
      kind: 'removeText',
      blockId: 'a',
      offset: 0,
      text: [{ text: 'bold', marks: ['bold'] }],
    };
    expect(applyThenInverse(withRun, delOp)).toEqual(withRun);
  });

  it('insertText/removeText round-trip', () => {
    const withRun: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'text', marks: ['italic'] }] },
    ];
    const insOp: TextOp = {
      kind: 'insertText',
      blockId: 'a',
      offset: 0,
      text: [{ text: 'bold ', marks: ['bold'] }],
    };
    expect(applyThenInverse(withRun, insOp)).toEqual(withRun);
  });

  it('removeText throws on content mismatch (self-verifying op)', () => {
    const withRun: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'bold text', marks: ['bold'] }] },
    ];
    expect(() =>
      applyOp(withRun, { kind: 'removeText', blockId: 'a', offset: 0, text: [{ text: 'WRONG' }] }),
    ).toThrow(/removeText/);
  });

  it('removeText throws on an out-of-bounds range', () => {
    const withRun: BaseBlock[] = [
      { id: 'a', type: 'text', content: [{ text: 'short', marks: ['bold'] }] },
    ];
    expect(() =>
      applyOp(withRun, {
        kind: 'removeText',
        blockId: 'a',
        offset: 0,
        text: [{ text: 'way too long', marks: ['bold'] }],
      }),
    ).toThrow(/removeText/);
  });
});

describe('error handling', () => {
  const blocks: BaseBlock[] = [{ id: 'a', type: 'text', content: 'hello world' }];

  it('throws on an unresolvable blockId for every op kind', () => {
    expect(() => applyOp(blocks, { kind: 'delete', blockId: 'missing' })).toThrow(
      'applyDelete: block "missing" not found',
    );
    expect(() =>
      applyOp(blocks, { kind: 'split', blockId: 'missing', offset: 0, newBlockId: 'x' }),
    ).toThrow(/applySplit/);
    expect(() => applyOp(blocks, { kind: 'mergePrev', blockId: 'missing' })).toThrow(
      /applyMergePrev/,
    );
    expect(() => applyOp(blocks, { kind: 'mergeNext', blockId: 'missing' })).toThrow(
      /applyMergeNext/,
    );
    expect(() => applyOp(blocks, { kind: 'convert', blockId: 'missing', newType: 'text' })).toThrow(
      /applyConvert/,
    );
    expect(() =>
      applyOp(blocks, { kind: 'insert', blocks: [], atBlockId: 'missing', atOffset: 0 }),
    ).toThrow(/applyInsert/);
    expect(() =>
      applyOp(blocks, { kind: 'applyMark', blockId: 'missing', start: 0, end: 1, mark: 'bold' }),
    ).toThrow(/applyMark/);
    expect(() =>
      applyOp(blocks, { kind: 'removeMark', blockId: 'missing', start: 0, end: 1, mark: 'bold' }),
    ).toThrow(/removeMark/);
    expect(() =>
      applyOp(blocks, { kind: 'insertText', blockId: 'missing', offset: 0, text: [{ text: 'x' }] }),
    ).toThrow(/insertText/);
    expect(() =>
      applyOp(blocks, { kind: 'removeText', blockId: 'missing', offset: 0, text: [{ text: 'x' }] }),
    ).toThrow(/removeText/);
  });

  it('mergePrev throws on the first block (no previous block to merge into)', () => {
    expect(() => applyOp(blocks, { kind: 'mergePrev', blockId: 'a' })).toThrow(/applyMergePrev/);
  });

  it('mergeNext throws on the last block (no next block to merge)', () => {
    expect(() => applyOp(blocks, { kind: 'mergeNext', blockId: 'a' })).toThrow(/applyMergeNext/);
  });

  it('split throws on an out-of-bounds offset', () => {
    expect(() =>
      applyOp(blocks, { kind: 'split', blockId: 'a', offset: 999, newBlockId: 'x' }),
    ).toThrow(/applySplit/);
  });
});
