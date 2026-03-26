import { describe, expect, it } from 'vitest';
import {
  contentHasMarks,
  contentToPlainText,
  createJsonSerializer,
  type SerializerBlock,
} from './serializer';
import type { InlineContent } from './types';

// =============================================================================
// Test fixtures
// =============================================================================

const headingBlock: SerializerBlock = {
  id: '1',
  type: 'heading',
  content: 'Hello World',
  meta: { level: 1 },
};

const textBlock: SerializerBlock = {
  id: '2',
  type: 'text',
  content: 'Simple paragraph',
};

const richTextBlock: SerializerBlock = {
  id: '3',
  type: 'text',
  content: [
    { text: 'Hello ' },
    { text: 'bold', marks: ['bold'] },
    { text: ' and ' },
    { text: 'italic', marks: ['italic'] },
    { text: ' and ' },
    { text: 'linked', marks: ['link'], href: 'https://example.com' },
    { text: ' text' },
  ] satisfies InlineContent[],
};

const codeBlock: SerializerBlock = {
  id: '4',
  type: 'code',
  content: 'const x = 1;',
  meta: { language: 'typescript' },
};

const listBlock: SerializerBlock = {
  id: '5',
  type: 'list',
  content: 'First item',
  meta: { ordered: false },
  children: ['5a', '5b'],
};

const quoteBlock: SerializerBlock = {
  id: '6',
  type: 'quote',
  content: 'To be or not to be',
};

const dividerBlock: SerializerBlock = {
  id: '7',
  type: 'divider',
};

const imageBlock: SerializerBlock = {
  id: '8',
  type: 'image',
  meta: { src: 'https://example.com/img.png', alt: 'Example image' },
};

const emptyBlock: SerializerBlock = {
  id: '9',
  type: 'text',
  content: '',
};

const allBlocks: SerializerBlock[] = [
  headingBlock,
  textBlock,
  richTextBlock,
  codeBlock,
  listBlock,
  quoteBlock,
  dividerBlock,
  imageBlock,
  emptyBlock,
];

// =============================================================================
// contentToPlainText
// =============================================================================

describe('contentToPlainText', () => {
  it('returns empty string for undefined', () => {
    expect(contentToPlainText(undefined)).toBe('');
  });

  it('returns string content as-is', () => {
    expect(contentToPlainText('hello')).toBe('hello');
  });

  it('joins InlineContent text segments', () => {
    const content: InlineContent[] = [{ text: 'hello ' }, { text: 'world', marks: ['bold'] }];
    expect(contentToPlainText(content)).toBe('hello world');
  });

  it('handles empty InlineContent array', () => {
    expect(contentToPlainText([])).toBe('');
  });
});

// =============================================================================
// contentHasMarks
// =============================================================================

describe('contentHasMarks', () => {
  it('returns false for undefined', () => {
    expect(contentHasMarks(undefined)).toBe(false);
  });

  it('returns false for string content', () => {
    expect(contentHasMarks('hello')).toBe(false);
  });

  it('returns false for InlineContent without marks', () => {
    expect(contentHasMarks([{ text: 'hello' }])).toBe(false);
  });

  it('returns false for InlineContent with empty marks array', () => {
    expect(contentHasMarks([{ text: 'hello', marks: [] }])).toBe(false);
  });

  it('returns true for InlineContent with marks', () => {
    expect(contentHasMarks([{ text: 'hello', marks: ['bold'] }])).toBe(true);
  });
});

// =============================================================================
// JSON Serializer
// =============================================================================

describe('createJsonSerializer', () => {
  const json = createJsonSerializer();

  it('has correct id and extensions', () => {
    expect(json.id).toBe('json');
    expect(json.extensions).toEqual(['.json']);
  });

  describe('serialize', () => {
    it('wraps blocks in versioned envelope', () => {
      const output = json.serialize([textBlock]);
      const parsed = JSON.parse(output);
      expect(parsed.version).toBe(1);
      expect(parsed.blocks).toHaveLength(1);
      expect(parsed.blocks[0].id).toBe('2');
    });

    it('includes frontmatter when provided', () => {
      const output = json.serialize([textBlock], { title: 'Test' });
      const parsed = JSON.parse(output);
      expect(parsed.frontmatter).toEqual({ title: 'Test' });
    });

    it('omits frontmatter when empty', () => {
      const output = json.serialize([textBlock], {});
      const parsed = JSON.parse(output);
      expect(parsed.frontmatter).toBeUndefined();
    });

    it('omits frontmatter when not provided', () => {
      const output = json.serialize([textBlock]);
      const parsed = JSON.parse(output);
      expect(parsed.frontmatter).toBeUndefined();
    });

    it('serializes all block types', () => {
      const output = json.serialize(allBlocks);
      const parsed = JSON.parse(output);
      expect(parsed.blocks).toHaveLength(allBlocks.length);
    });

    it('preserves InlineContent with marks', () => {
      const output = json.serialize([richTextBlock]);
      const parsed = JSON.parse(output);
      const content = parsed.blocks[0].content;
      expect(Array.isArray(content)).toBe(true);
      expect(content[1].text).toBe('bold');
      expect(content[1].marks).toEqual(['bold']);
    });

    it('preserves meta fields', () => {
      const output = json.serialize([codeBlock]);
      const parsed = JSON.parse(output);
      expect(parsed.blocks[0].meta).toEqual({ language: 'typescript' });
    });

    it('preserves children and parentId', () => {
      const parent: SerializerBlock = { id: 'p', type: 'list', children: ['c1', 'c2'] };
      const child: SerializerBlock = { id: 'c1', type: 'text', content: 'item', parentId: 'p' };
      const output = json.serialize([parent, child]);
      const parsed = JSON.parse(output);
      expect(parsed.blocks[0].children).toEqual(['c1', 'c2']);
      expect(parsed.blocks[1].parentId).toBe('p');
    });

    it('produces formatted output', () => {
      const output = json.serialize([textBlock]);
      expect(output).toContain('\n');
    });
  });

  describe('deserialize', () => {
    it('parses versioned envelope', () => {
      const input = JSON.stringify({ version: 1, blocks: [textBlock] });
      const result = json.deserialize(input);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe('2');
    });

    it('parses envelope with frontmatter', () => {
      const input = JSON.stringify({
        version: 1,
        blocks: [textBlock],
        frontmatter: { title: 'Test' },
      });
      const result = json.deserialize(input);
      expect(result.frontmatter).toEqual({ title: 'Test' });
    });

    it('parses bare block array', () => {
      const input = JSON.stringify([textBlock, headingBlock]);
      const result = json.deserialize(input);
      expect(result.blocks).toHaveLength(2);
      expect(result.frontmatter).toBeUndefined();
    });

    it('parses empty block array', () => {
      const input = JSON.stringify([]);
      const result = json.deserialize(input);
      expect(result.blocks).toHaveLength(0);
    });

    it('throws on invalid JSON', () => {
      expect(() => json.deserialize('not json')).toThrow();
    });

    it('throws on unexpected shape', () => {
      expect(() => json.deserialize('"a string"')).toThrow('Invalid JSON format');
    });

    it('throws on object without version', () => {
      expect(() => json.deserialize(JSON.stringify({ blocks: [] }))).toThrow('Invalid JSON format');
    });

    it('throws on object without blocks', () => {
      expect(() => json.deserialize(JSON.stringify({ version: 1 }))).toThrow('Invalid JSON format');
    });
  });

  describe('round-trip', () => {
    it('preserves all block types through serialize -> deserialize', () => {
      const serialized = json.serialize(allBlocks);
      const { blocks } = json.deserialize(serialized);
      expect(blocks).toEqual(allBlocks);
    });

    it('preserves frontmatter through round-trip', () => {
      const frontmatter = { title: 'Test', tags: ['a', 'b'], nested: { key: 'value' } };
      const serialized = json.serialize(allBlocks, frontmatter);
      const result = json.deserialize(serialized);
      expect(result.blocks).toEqual(allBlocks);
      expect(result.frontmatter).toEqual(frontmatter);
    });

    it('preserves InlineContent marks through round-trip', () => {
      const serialized = json.serialize([richTextBlock]);
      const { blocks } = json.deserialize(serialized);
      const content = blocks[0].content as InlineContent[];
      expect(content[1].marks).toEqual(['bold']);
      expect(content[3].marks).toEqual(['italic']);
      expect(content[5].marks).toEqual(['link']);
      expect(content[5].href).toBe('https://example.com');
    });

    it('round-trips empty blocks', () => {
      const serialized = json.serialize([]);
      const { blocks } = json.deserialize(serialized);
      expect(blocks).toEqual([]);
    });

    it('round-trips blocks with empty content', () => {
      const serialized = json.serialize([emptyBlock]);
      const { blocks } = json.deserialize(serialized);
      expect(blocks[0].content).toBe('');
    });
  });
});
