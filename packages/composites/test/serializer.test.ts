import { describe, expect, it } from 'vitest';
import type { CompositeBlock } from '../src/manifest';
import { toMdx } from '../src/serializer';

describe('toMdx', () => {
  it('returns empty string for empty blocks', () => {
    expect(toMdx([])).toBe('');
  });

  it('serializes text block', () => {
    expect(toMdx([{ id: '1', type: 'text', content: 'Hello world' }])).toBe('<p>Hello world</p>');
  });

  it('serializes text block with empty content', () => {
    expect(toMdx([{ id: '1', type: 'text' }])).toBe('<p></p>');
  });

  it('serializes heading with level', () => {
    expect(toMdx([{ id: '1', type: 'heading', content: 'Title', meta: { level: 1 } }])).toBe(
      '# Title',
    );
  });

  it('serializes heading with default level 2', () => {
    expect(toMdx([{ id: '1', type: 'heading', content: 'Subtitle' }])).toBe('## Subtitle');
  });

  it('serializes heading levels 1-6', () => {
    for (let level = 1; level <= 6; level++) {
      const hashes = '#'.repeat(level);
      expect(toMdx([{ id: '1', type: 'heading', content: 'Test', meta: { level } }])).toBe(
        `${hashes} Test`,
      );
    }
  });

  it('serializes blockquote', () => {
    expect(toMdx([{ id: '1', type: 'blockquote', content: 'A quote' }])).toBe('> A quote');
  });

  it('serializes unordered list', () => {
    expect(
      toMdx([
        { id: '1', type: 'list', content: ['One', 'Two', 'Three'], meta: { ordered: false } },
      ]),
    ).toBe('- One\n- Two\n- Three');
  });

  it('serializes ordered list', () => {
    expect(
      toMdx([{ id: '1', type: 'list', content: ['First', 'Second'], meta: { ordered: true } }]),
    ).toBe('1. First\n2. Second');
  });

  it('serializes composite reference to PascalCase', () => {
    expect(toMdx([{ id: '1', type: 'composite:login-form' }])).toBe('<LoginForm />');
  });

  it('serializes multi-word composite reference', () => {
    expect(toMdx([{ id: '1', type: 'composite:user-profile' }])).toBe('<UserProfile />');
  });

  it('serializes single-word composite reference', () => {
    expect(toMdx([{ id: '1', type: 'composite:sidebar' }])).toBe('<Sidebar />');
  });

  it('serializes grid with children', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', meta: { columns: 2 }, children: ['2', '3'] },
      { id: '2', type: 'text', content: 'Left', parentId: '1' },
      { id: '3', type: 'text', content: 'Right', parentId: '1' },
    ];
    expect(toMdx(blocks)).toBe('<Grid columns={2}>\n<p>Left</p>\n<p>Right</p>\n</Grid>');
  });

  it('serializes grid with default columns', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', children: ['2'] },
      { id: '2', type: 'text', content: 'Solo', parentId: '1' },
    ];
    expect(toMdx(blocks)).toBe('<Grid columns={1}>\n<p>Solo</p>\n</Grid>');
  });

  it('serializes divider', () => {
    expect(toMdx([{ id: '1', type: 'divider' }])).toBe('---');
  });

  it('does not serialize child blocks at root level', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', children: ['2'], meta: { columns: 1 } },
      { id: '2', type: 'text', content: 'Child', parentId: '1' },
    ];
    const result = toMdx(blocks);
    expect(result).toBe('<Grid columns={1}>\n<p>Child</p>\n</Grid>');
    // Child should not appear as a standalone root element
    expect(result.startsWith('<p>Child</p>')).toBe(false);
  });

  it('emits comment for unknown block type', () => {
    expect(toMdx([{ id: '1', type: 'mystery', content: 'x' }])).toBe(
      '<!-- unknown block type: mystery -->',
    );
  });

  it('skips missing children references', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', children: ['2', 'nonexistent'], meta: { columns: 2 } },
      { id: '2', type: 'text', content: 'Exists', parentId: '1' },
    ];
    expect(toMdx(blocks)).toBe('<Grid columns={2}>\n<p>Exists</p>\n</Grid>');
  });

  it('serializes multiple root blocks separated by newlines', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'text', content: 'First' },
      { id: '2', type: 'divider' },
      { id: '3', type: 'text', content: 'Last' },
    ];
    expect(toMdx(blocks)).toBe('<p>First</p>\n---\n<p>Last</p>');
  });

  it('clamps heading level 0 to level 1', () => {
    expect(toMdx([{ id: '1', type: 'heading', content: 'Zero', meta: { level: 0 } }])).toBe(
      '# Zero',
    );
  });

  it('clamps heading level 7 to level 6', () => {
    expect(toMdx([{ id: '1', type: 'heading', content: 'Seven', meta: { level: 7 } }])).toBe(
      '###### Seven',
    );
  });

  it('emits comment for composite: with empty suffix', () => {
    expect(toMdx([{ id: '1', type: 'composite:' }])).toBe(
      '<!-- invalid composite type: composite: -->',
    );
  });

  it('detects circular references in grid children', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', meta: { columns: 1 }, children: ['2'] },
      { id: '2', type: 'grid', meta: { columns: 1 }, children: ['1'], parentId: '1' },
    ];
    const result = toMdx(blocks);
    expect(result).toContain('<!-- circular reference detected -->');
  });

  it('handles nested grid children', () => {
    const blocks: CompositeBlock[] = [
      { id: '1', type: 'grid', meta: { columns: 1 }, children: ['2'] },
      { id: '2', type: 'grid', meta: { columns: 2 }, children: ['3', '4'], parentId: '1' },
      { id: '3', type: 'text', content: 'A', parentId: '2' },
      { id: '4', type: 'text', content: 'B', parentId: '2' },
    ];
    expect(toMdx(blocks)).toBe(
      '<Grid columns={1}>\n<Grid columns={2}>\n<p>A</p>\n<p>B</p>\n</Grid>\n</Grid>',
    );
  });
});
