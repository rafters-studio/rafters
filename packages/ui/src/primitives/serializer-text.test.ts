import { describe, expect, it } from 'vitest';
import type { SerializerBlock } from './serializer';
import { createTextSerializer, textSerializer } from './serializer-text';
import type { InlineContent } from './types';

function deserialize(input: string) {
  return textSerializer.deserialize(input);
}

function serialize(blocks: SerializerBlock[]) {
  return textSerializer.serialize(blocks);
}

describe('createTextSerializer', () => {
  it('has correct id and extensions', () => {
    const text = createTextSerializer();
    expect(text.id).toBe('text');
    expect(text.extensions).toEqual(['.txt']);
  });
});

describe('deserialize text', () => {
  it('parses plain paragraphs', () => {
    const { blocks } = deserialize('Hello world');
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toBe('Hello world');
  });

  it('splits on double newlines', () => {
    const { blocks } = deserialize('First paragraph\n\nSecond paragraph');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toBe('First paragraph');
    expect(blocks[1].content).toBe('Second paragraph');
  });

  it('parses headings', () => {
    const { blocks } = deserialize('# Title\n\n## Subtitle');
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].content).toBe('Title');
    expect(blocks[0].meta?.level).toBe(1);
    expect(blocks[1].meta?.level).toBe(2);
  });

  it('parses dividers', () => {
    const { blocks } = deserialize('Above\n\n---\n\nBelow');
    expect(blocks[1].type).toBe('divider');
  });

  it('parses unordered lists', () => {
    const { blocks } = deserialize('- First\n- Second\n- Third');
    const list = blocks.find((b) => b.type === 'list');
    expect(list?.meta?.ordered).toBe(false);
    expect(list?.children).toHaveLength(3);
    expect(blocks.filter((b) => b.type === 'list-item')[0].content).toBe('First');
  });

  it('parses ordered lists', () => {
    const { blocks } = deserialize('1. First\n2. Second');
    const list = blocks.find((b) => b.type === 'list');
    expect(list?.meta?.ordered).toBe(true);
    expect(list?.children).toHaveLength(2);
  });

  it('handles empty input', () => {
    const { blocks } = deserialize('');
    expect(blocks).toEqual([]);
  });

  it('handles whitespace-only input', () => {
    const { blocks } = deserialize('   \n\n  \n');
    expect(blocks).toEqual([]);
  });
});

describe('serialize text', () => {
  it('serializes headings', () => {
    const output = serialize([{ id: '1', type: 'heading', content: 'Hello', meta: { level: 1 } }]);
    expect(output.trim()).toBe('# Hello');
  });

  it('serializes paragraphs', () => {
    const output = serialize([{ id: '1', type: 'text', content: 'Hello world' }]);
    expect(output.trim()).toBe('Hello world');
  });

  it('strips inline marks', () => {
    const content: InlineContent[] = [
      { text: 'Hello ' },
      { text: 'bold', marks: ['bold'] },
      { text: ' world' },
    ];
    const output = serialize([{ id: '1', type: 'text', content }]);
    expect(output.trim()).toBe('Hello bold world');
  });

  it('serializes dividers', () => {
    const output = serialize([{ id: '1', type: 'divider' }]);
    expect(output.trim()).toBe('---');
  });

  it('serializes images as alt text', () => {
    const output = serialize([
      { id: '1', type: 'image', meta: { src: 'https://example.com/img.png', alt: 'My image' } },
    ]);
    expect(output.trim()).toBe('My image');
  });

  it('serializes blockquotes', () => {
    const output = serialize([{ id: '1', type: 'quote', content: 'Wise words' }]);
    expect(output.trim()).toBe('> Wise words');
  });

  it('serializes lists', () => {
    const blocks: SerializerBlock[] = [
      { id: 'i1', type: 'list-item', content: 'One', parentId: 'l1' },
      { id: 'i2', type: 'list-item', content: 'Two', parentId: 'l1' },
      { id: 'l1', type: 'list', meta: { ordered: false }, children: ['i1', 'i2'] },
    ];
    const output = serialize(blocks);
    expect(output).toContain('- One');
    expect(output).toContain('- Two');
  });

  it('serializes ordered lists with numbers', () => {
    const blocks: SerializerBlock[] = [
      { id: 'i1', type: 'list-item', content: 'First', parentId: 'l1' },
      { id: 'i2', type: 'list-item', content: 'Second', parentId: 'l1' },
      { id: 'l1', type: 'list', meta: { ordered: true }, children: ['i1', 'i2'] },
    ];
    const output = serialize(blocks);
    expect(output).toContain('1. First');
    expect(output).toContain('2. Second');
  });

  it('separates blocks with double newlines', () => {
    const output = serialize([
      { id: '1', type: 'heading', content: 'Title', meta: { level: 1 } },
      { id: '2', type: 'text', content: 'Content' },
    ]);
    expect(output).toContain('# Title\n\nContent');
  });
});

describe('round-trip', () => {
  it('preserves headings', () => {
    const input = '# Hello\n\n## World';
    const { blocks } = deserialize(input);
    const output = serialize(blocks);
    expect(output).toContain('# Hello');
    expect(output).toContain('## World');
  });

  it('preserves paragraphs', () => {
    const input = 'First\n\nSecond';
    const { blocks } = deserialize(input);
    const output = serialize(blocks);
    expect(output).toContain('First');
    expect(output).toContain('Second');
  });

  it('preserves lists', () => {
    const input = '- One\n- Two\n- Three';
    const { blocks } = deserialize(input);
    const output = serialize(blocks);
    expect(output).toContain('- One');
    expect(output).toContain('- Two');
    expect(output).toContain('- Three');
  });
});
