import { describe, expect, it } from 'vitest';
import type { SerializerBlock } from './serializer';
import { createMdxSerializer, mdxSerializer } from './serializer-mdx';
import type { InlineContent } from './types';

// =============================================================================
// Helpers
// =============================================================================

function deserialize(input: string) {
  return mdxSerializer.deserialize(input);
}

function serialize(blocks: SerializerBlock[], frontmatter?: Record<string, unknown>) {
  return mdxSerializer.serialize(blocks, frontmatter);
}

function getBlock(input: string, index = 0): SerializerBlock {
  const { blocks } = deserialize(input);
  const block = blocks[index];
  if (!block) throw new Error(`No block at index ${index}, got ${blocks.length} blocks`);
  return block;
}

// =============================================================================
// Factory
// =============================================================================

describe('createMdxSerializer', () => {
  it('has correct id and extensions', () => {
    const mdx = createMdxSerializer();
    expect(mdx.id).toBe('mdx');
    expect(mdx.extensions).toEqual(['.mdx', '.md']);
  });
});

// =============================================================================
// Deserialize: Markdown elements
// =============================================================================

describe('deserialize markdown', () => {
  it('parses headings', () => {
    const h1 = getBlock('# Hello');
    expect(h1.type).toBe('heading');
    expect(h1.content).toBe('Hello');
    expect(h1.meta?.level).toBe(1);

    const h3 = getBlock('### Third level');
    expect(h3.meta?.level).toBe(3);
  });

  it('parses paragraphs', () => {
    const p = getBlock('Hello world');
    expect(p.type).toBe('text');
    expect(p.content).toBe('Hello world');
  });

  it('parses bold text', () => {
    const p = getBlock('Hello **bold** world');
    expect(p.type).toBe('text');
    const content = p.content as InlineContent[];
    expect(Array.isArray(content)).toBe(true);
    const boldSegment = content.find((s) => s.marks?.includes('bold'));
    expect(boldSegment?.text).toBe('bold');
  });

  it('parses italic text', () => {
    const p = getBlock('Hello *italic* world');
    const content = p.content as InlineContent[];
    const italicSegment = content.find((s) => s.marks?.includes('italic'));
    expect(italicSegment?.text).toBe('italic');
  });

  it('parses inline code', () => {
    const p = getBlock('Hello `code` world');
    const content = p.content as InlineContent[];
    const codeSegment = content.find((s) => s.marks?.includes('code'));
    expect(codeSegment?.text).toBe('code');
  });

  it('parses links', () => {
    const p = getBlock('Click [here](https://example.com) now');
    const content = p.content as InlineContent[];
    const linkSegment = content.find((s) => s.marks?.includes('link'));
    expect(linkSegment?.text).toBe('here');
    expect(linkSegment?.href).toBe('https://example.com');
  });

  it('parses fenced code blocks', () => {
    const block = getBlock('```typescript\nconst x = 1;\n```');
    expect(block.type).toBe('code');
    expect(block.content).toBe('const x = 1;');
    expect(block.meta?.language).toBe('typescript');
  });

  it('parses code blocks without language', () => {
    const block = getBlock('```\nsome code\n```');
    expect(block.type).toBe('code');
    expect(block.content).toBe('some code');
  });

  it('parses blockquotes', () => {
    const block = getBlock('> To be or not to be');
    expect(block.type).toBe('quote');
  });

  it('parses unordered lists', () => {
    const { blocks } = deserialize('- First\n- Second\n- Third');
    const list = blocks.find((b) => b.type === 'list');
    expect(list).toBeTruthy();
    expect(list?.meta?.ordered).toBe(false);
    expect(list?.children).toHaveLength(3);

    const items = blocks.filter((b) => b.type === 'list-item');
    expect(items).toHaveLength(3);
    expect(items[0].content).toBe('First');
  });

  it('parses ordered lists', () => {
    const { blocks } = deserialize('1. First\n2. Second');
    const list = blocks.find((b) => b.type === 'list');
    expect(list?.meta?.ordered).toBe(true);
  });

  it('parses thematic breaks', () => {
    const { blocks } = deserialize('Above\n\n---\n\nBelow');
    const divider = blocks.find((b) => b.type === 'divider');
    expect(divider).toBeTruthy();
  });

  it('parses images', () => {
    const block = getBlock('![Alt text](https://example.com/img.png)');
    expect(block.type).toBe('image');
    expect(block.meta?.src).toBe('https://example.com/img.png');
    expect(block.meta?.alt).toBe('Alt text');
  });
});

// =============================================================================
// Deserialize: MDX elements
// =============================================================================

describe('deserialize MDX', () => {
  it('parses self-closing JSX components', () => {
    const block = getBlock('<Hero title="Welcome" />');
    expect(block.type).toBe('component');
    expect(block.meta?.component).toBe('Hero');
    expect(block.meta?.selfClosing).toBe(true);
    const props = block.meta?.props as Record<string, unknown>;
    expect(props.title).toBe('Welcome');
  });

  it('parses JSX with boolean props', () => {
    const block = getBlock('<Button primary />');
    expect(block.type).toBe('component');
    const props = block.meta?.props as Record<string, unknown>;
    expect(props.primary).toBe(true);
  });

  it('parses JSX with expression props', () => {
    const block = getBlock('<List items={data} />');
    expect(block.type).toBe('component');
    const props = block.meta?.props as Record<string, unknown>;
    expect(props.items).toBe('{data}');
  });

  it('parses JSX with children', () => {
    const input = '<Note>\n\nThis is a note.\n\n</Note>';
    const { blocks } = deserialize(input);
    const component = blocks.find((b) => b.type === 'component');
    expect(component).toBeTruthy();
    expect(component?.meta?.component).toBe('Note');
    expect(component?.meta?.selfClosing).toBe(false);
    expect(component?.children?.length).toBeGreaterThan(0);
  });

  it('parses import statements', () => {
    const input = "import Hero from './Hero'\n\n# Hello";
    const { blocks } = deserialize(input);
    const esm = blocks.find((b) => b.type === 'esm');
    expect(esm).toBeTruthy();
    expect(esm?.content).toContain("import Hero from './Hero'");
  });

  it('parses block expressions', () => {
    const block = getBlock('{someVariable}');
    expect(block.type).toBe('expression');
    expect(block.content).toBe('someVariable');
  });
});

// =============================================================================
// Deserialize: Frontmatter
// =============================================================================

describe('deserialize frontmatter', () => {
  it('parses YAML frontmatter', () => {
    const input = '---\ntitle: Hello\nauthor: Sean\n---\n\n# Content';
    const { blocks, frontmatter } = deserialize(input);
    expect(frontmatter?.title).toBe('Hello');
    expect(frontmatter?.author).toBe('Sean');
    expect(blocks[0].type).toBe('heading');
  });

  it('parses frontmatter with boolean values', () => {
    const input = '---\ndraft: true\npublished: false\n---\n\nContent';
    const { frontmatter } = deserialize(input);
    expect(frontmatter?.draft).toBe(true);
    expect(frontmatter?.published).toBe(false);
  });

  it('parses frontmatter with number values', () => {
    const input = '---\norder: 42\n---\n\nContent';
    const { frontmatter } = deserialize(input);
    expect(frontmatter?.order).toBe(42);
  });

  it('parses frontmatter with array values', () => {
    const input = '---\ntags: [react, mdx, design]\n---\n\nContent';
    const { frontmatter } = deserialize(input);
    expect(frontmatter?.tags).toEqual(['react', 'mdx', 'design']);
  });

  it('returns no frontmatter when absent', () => {
    const { frontmatter } = deserialize('# Just content');
    expect(frontmatter).toBeUndefined();
  });
});

// =============================================================================
// Serialize
// =============================================================================

describe('serialize', () => {
  it('serializes headings', () => {
    const output = serialize([{ id: '1', type: 'heading', content: 'Hello', meta: { level: 1 } }]);
    expect(output).toContain('# Hello');
  });

  it('serializes paragraphs', () => {
    const output = serialize([{ id: '1', type: 'text', content: 'Hello world' }]);
    expect(output).toContain('Hello world');
  });

  it('serializes inline marks', () => {
    const content: InlineContent[] = [
      { text: 'Hello ' },
      { text: 'bold', marks: ['bold'] },
      { text: ' world' },
    ];
    const output = serialize([{ id: '1', type: 'text', content }]);
    expect(output).toContain('**bold**');
  });

  it('serializes links', () => {
    const content: InlineContent[] = [
      { text: 'click ', marks: [] },
      { text: 'here', marks: ['link'], href: 'https://example.com' },
    ];
    const output = serialize([{ id: '1', type: 'text', content }]);
    expect(output).toContain('[here](https://example.com)');
  });

  it('serializes code blocks', () => {
    const output = serialize([
      { id: '1', type: 'code', content: 'const x = 1;', meta: { language: 'ts' } },
    ]);
    expect(output).toContain('```ts');
    expect(output).toContain('const x = 1;');
    expect(output).toContain('```');
  });

  it('serializes dividers', () => {
    const output = serialize([{ id: '1', type: 'divider' }]);
    expect(output).toContain('---');
  });

  it('serializes images', () => {
    const output = serialize([
      { id: '1', type: 'image', meta: { src: 'https://example.com/img.png', alt: 'My image' } },
    ]);
    expect(output).toContain('![My image](https://example.com/img.png)');
  });

  it('serializes self-closing components', () => {
    const output = serialize([
      {
        id: '1',
        type: 'component',
        meta: { component: 'Hero', props: { title: 'Welcome' }, selfClosing: true },
      },
    ]);
    expect(output).toContain('<Hero');
    expect(output).toContain('title="Welcome"');
    expect(output).toContain('/>');
  });

  it('serializes frontmatter', () => {
    const output = serialize([{ id: '1', type: 'text', content: 'Hello' }], {
      title: 'My Page',
      draft: true,
    });
    expect(output).toContain('---');
    expect(output).toContain('title: My Page');
    expect(output).toContain('draft: true');
  });

  it('serializes lists', () => {
    const blocks: SerializerBlock[] = [
      { id: 'i1', type: 'list-item', content: 'First', parentId: 'l1' },
      { id: 'i2', type: 'list-item', content: 'Second', parentId: 'l1' },
      { id: 'l1', type: 'list', meta: { ordered: false }, children: ['i1', 'i2'] },
    ];
    const output = serialize(blocks);
    expect(output).toContain('* First');
    expect(output).toContain('* Second');
  });
});

// =============================================================================
// Round-trip
// =============================================================================

describe('round-trip', () => {
  function roundTrip(input: string): string {
    const { blocks, frontmatter } = deserialize(input);
    return serialize(blocks, frontmatter);
  }

  it('preserves headings', () => {
    const output = roundTrip('# Hello World\n');
    expect(output.trim()).toBe('# Hello World');
  });

  it('preserves paragraphs with inline marks', () => {
    const output = roundTrip('Hello **bold** and *italic* text\n');
    expect(output).toContain('**bold**');
    expect(output).toContain('*italic*');
  });

  it('preserves code blocks', () => {
    const input = '```typescript\nconst x = 1;\n```\n';
    const output = roundTrip(input);
    expect(output).toContain('```typescript');
    expect(output).toContain('const x = 1;');
  });

  it('preserves links', () => {
    const output = roundTrip('Click [here](https://example.com) now\n');
    expect(output).toContain('[here](https://example.com)');
  });

  it('preserves images', () => {
    const output = roundTrip('![Alt](https://example.com/img.png)\n');
    expect(output).toContain('![Alt](https://example.com/img.png)');
  });

  it('preserves frontmatter', () => {
    const input = '---\ntitle: Hello\ndraft: true\n---\n\n# Content\n';
    const output = roundTrip(input);
    expect(output).toContain('title: Hello');
    expect(output).toContain('draft: true');
    expect(output).toContain('# Content');
  });

  it('preserves self-closing JSX components', () => {
    const output = roundTrip('<Hero title="Welcome" />\n');
    expect(output).toContain('<Hero');
    expect(output).toContain('title="Welcome"');
  });

  it('preserves mixed content', () => {
    const input = [
      '# Title',
      '',
      'A paragraph with **bold** text.',
      '',
      '<Callout type="warning">',
      '',
      'Be careful!',
      '',
      '</Callout>',
      '',
      '---',
      '',
      '```js',
      'const x = 1;',
      '```',
      '',
    ].join('\n');
    const output = roundTrip(input);
    expect(output).toContain('# Title');
    expect(output).toContain('**bold**');
    expect(output).toContain('<Callout');
    expect(output).toContain('Be careful!');
    expect(output).toContain('```js');
  });
});
