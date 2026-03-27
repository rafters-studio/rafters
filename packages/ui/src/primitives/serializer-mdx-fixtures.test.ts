import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SerializerBlock } from './serializer';
import { mdxSerializer } from './serializer-mdx';
import type { InlineContent } from './types';

// =============================================================================
// Helpers
// =============================================================================

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, '__fixtures__', name), 'utf-8');
}

function deserialize(input: string) {
  return mdxSerializer.deserialize(input);
}

function roundTrip(input: string): string {
  const { blocks, frontmatter } = deserialize(input);
  return mdxSerializer.serialize(blocks, frontmatter);
}

function findBlocks(blocks: SerializerBlock[], type: string): SerializerBlock[] {
  return blocks.filter((b) => b.type === type);
}

// =============================================================================
// Real-world MDX fixture
// =============================================================================

describe('real-world.mdx fixture', () => {
  const fixture = loadFixture('real-world.mdx');
  const { blocks, frontmatter } = deserialize(fixture);

  describe('frontmatter', () => {
    it('parses all frontmatter fields', () => {
      expect(frontmatter).toBeDefined();
      expect(frontmatter?.title).toBe('Building Design Intelligence');
      expect(frontmatter?.author).toBe('Sean Silvius');
      expect(frontmatter?.date).toBe('2026-03-26');
      expect(frontmatter?.tags).toEqual(['design', 'engineering', 'AI']);
      expect(frontmatter?.draft).toBe(false);
      expect(frontmatter?.order).toBe(1);
    });
  });

  describe('imports', () => {
    it('captures import statements', () => {
      const esm = findBlocks(blocks, 'esm');
      expect(esm.length).toBeGreaterThan(0);
      const esmContent = esm.map((b) => b.content).join('\n');
      expect(esmContent).toContain('import');
    });
  });

  describe('block types', () => {
    it('has headings at correct levels', () => {
      const headings = findBlocks(blocks, 'heading');
      expect(headings.length).toBeGreaterThanOrEqual(3);

      const h1 = headings.find((h) => h.meta?.level === 1);
      expect(h1?.content).toBe('Building Design Intelligence');

      const h2s = headings.filter((h) => h.meta?.level === 2);
      expect(h2s.length).toBeGreaterThanOrEqual(2);
    });

    it('has paragraphs with inline formatting', () => {
      const texts = findBlocks(blocks, 'text');
      expect(texts.length).toBeGreaterThan(0);

      // Find the paragraph with bold "Rafters"
      const raftersPara = texts.find((t) => {
        if (typeof t.content === 'string') return t.content.includes('Rafters');
        if (Array.isArray(t.content)) return t.content.some((s) => s.text.includes('Rafters'));
        return false;
      });
      expect(raftersPara).toBeTruthy();
    });

    it('has ordered list with inline marks', () => {
      const lists = findBlocks(blocks, 'list');
      const orderedList = lists.find((l) => l.meta?.ordered === true);
      expect(orderedList).toBeTruthy();
      expect(orderedList?.children?.length).toBe(3);
    });

    it('has code block with language', () => {
      const codeBlocks = findBlocks(blocks, 'code');
      expect(codeBlocks.length).toBeGreaterThan(0);
      const tsBlock = codeBlocks.find((c) => c.meta?.language === 'typescript');
      expect(tsBlock).toBeTruthy();
      expect(tsBlock?.content).toContain('registry.get');
    });

    it('has a divider', () => {
      expect(findBlocks(blocks, 'divider').length).toBeGreaterThan(0);
    });

    it('has an image', () => {
      const images = findBlocks(blocks, 'image');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].meta?.src).toBe('https://example.com/architecture.png');
    });

    it('has JSX components', () => {
      const components = findBlocks(blocks, 'component');
      expect(components.length).toBeGreaterThan(0);

      // Card with children
      const card = components.find((c) => c.meta?.component === 'Card' && c.children?.length);
      expect(card).toBeTruthy();

      // Chart with expression props
      const chart = components.find((c) => c.meta?.component === 'Chart');
      expect(chart).toBeTruthy();

      // Badge components are inline -- they appear in paragraph InlineContent, not as block components
    });
  });

  describe('round-trip', () => {
    it('preserves content through round-trip', () => {
      const output = roundTrip(fixture);

      // Frontmatter preserved
      expect(output).toContain('title: Building Design Intelligence');
      expect(output).toContain('draft: false');

      // Headings preserved
      expect(output).toContain('# Building Design Intelligence');
      expect(output).toContain('## The Three Layers');

      // Inline formatting preserved
      expect(output).toContain('**Rafters**');

      // Code blocks preserved
      expect(output).toContain('```typescript');
      expect(output).toContain('registry.get');

      // JSX preserved
      expect(output).toContain('<Card');
      expect(output).toContain('<Chart');

      // Image preserved
      expect(output).toContain('![Architecture Diagram]');

      // Link preserved
      expect(output).toContain('[documentation](https://rafters.dev)');
    });
  });
});

// =============================================================================
// Edge cases MDX fixture
// =============================================================================

describe('edge-cases.mdx fixture', () => {
  const fixture = loadFixture('edge-cases.mdx');
  const { blocks, frontmatter } = deserialize(fixture);

  describe('frontmatter edge cases', () => {
    it('parses zero as number', () => {
      expect(frontmatter?.zero).toBe(0);
    });

    it('parses negative numbers', () => {
      expect(frontmatter?.negative).toBe(-42);
    });

    it('parses floats', () => {
      expect(frontmatter?.float).toBe(3.14);
    });

    it('parses null values', () => {
      expect(frontmatter?.null_value).toBe(null);
    });

    it('parses inline arrays', () => {
      expect(frontmatter?.array_inline).toEqual(['one', 'two', 'three']);
    });

    it('parses quoted strings with special chars', () => {
      expect(frontmatter?.quoted).toBe('value: with colons');
    });
  });

  describe('import patterns', () => {
    it('captures all import styles', () => {
      const esm = findBlocks(blocks, 'esm');
      const esmContent = esm.map((b) => b.content).join('\n');
      expect(esmContent).toContain('import');
    });
  });

  describe('inline formatting', () => {
    it('handles multiple marks in one paragraph', () => {
      const texts = findBlocks(blocks, 'text');
      const stressTest = texts.find((t) => {
        const plain =
          typeof t.content === 'string'
            ? t.content
            : Array.isArray(t.content)
              ? t.content.map((s) => s.text).join('')
              : '';
        return plain.includes('bold') && plain.includes('italic') && plain.includes('code');
      });
      expect(stressTest).toBeTruthy();

      if (Array.isArray(stressTest?.content)) {
        const content = stressTest.content as InlineContent[];
        expect(content.some((s) => s.marks?.includes('bold'))).toBe(true);
        expect(content.some((s) => s.marks?.includes('italic'))).toBe(true);
        expect(content.some((s) => s.marks?.includes('code'))).toBe(true);
        // Strikethrough (~~text~~) requires remark-gfm -- not supported in base MDX parser
        expect(content.some((s) => s.marks?.includes('link'))).toBe(true);
      }
    });
  });

  describe('JSX patterns', () => {
    it('handles self-closing components', () => {
      const components = findBlocks(blocks, 'component');
      const selfClosing = components.find(
        (c) => c.meta?.component === 'SelfClosing' && c.meta?.selfClosing === true,
      );
      expect(selfClosing).toBeTruthy();
    });

    it('handles empty components', () => {
      const components = findBlocks(blocks, 'component');
      const empty = components.find((c) => c.meta?.component === 'Empty');
      expect(empty).toBeTruthy();
    });

    it('handles components with various prop types', () => {
      const components = findBlocks(blocks, 'component');
      const withProps = components.find((c) => c.meta?.component === 'WithProps');
      expect(withProps).toBeTruthy();
      const props = withProps?.meta?.props as Record<string, unknown>;
      expect(props.title).toBe('hello');
      expect(props.active).toBe(true);
      expect(props.flag).toBe(true);
    });

    it('handles spread props', () => {
      const components = findBlocks(blocks, 'component');
      const withSpread = components.find((c) => c.meta?.component === 'WithSpread');
      expect(withSpread).toBeTruthy();
    });

    it('handles nested components with markdown children', () => {
      const components = findBlocks(blocks, 'component');
      const nested = components.find((c) => c.meta?.component === 'Nested' && c.children?.length);
      expect(nested).toBeTruthy();
    });
  });

  describe('expression patterns', () => {
    it('handles block expressions', () => {
      const expressions = findBlocks(blocks, 'expression');
      expect(expressions.length).toBeGreaterThan(0);
    });
  });

  describe('lists', () => {
    it('handles unordered lists with formatting', () => {
      const lists = findBlocks(blocks, 'list');
      const unordered = lists.find((l) => l.meta?.ordered === false);
      expect(unordered).toBeTruthy();
      expect(unordered?.children?.length).toBe(3);
    });

    it('handles ordered lists', () => {
      const lists = findBlocks(blocks, 'list');
      const ordered = lists.find((l) => l.meta?.ordered === true);
      expect(ordered).toBeTruthy();
      expect(ordered?.children?.length).toBe(3);
    });
  });

  describe('code blocks', () => {
    it('handles code blocks with various languages', () => {
      const codeBlocks = findBlocks(blocks, 'code');
      expect(codeBlocks.length).toBeGreaterThanOrEqual(3);

      const jsBlock = codeBlocks.find((c) => c.meta?.language === 'js');
      expect(jsBlock).toBeTruthy();
      expect(jsBlock?.content).toContain('const x =');

      const pyBlock = codeBlocks.find((c) => c.meta?.language === 'python');
      expect(pyBlock).toBeTruthy();

      const noLang = codeBlocks.find((c) => !c.meta?.language || c.meta?.language === '');
      expect(noLang).toBeTruthy();
    });
  });

  describe('round-trip', () => {
    it('preserves content through round-trip', () => {
      const output = roundTrip(fixture);

      // Frontmatter
      expect(output).toContain('title: Edge Cases');

      // JSX
      expect(output).toContain('<SelfClosing');
      expect(output).toContain('<WithProps');
      expect(output).toContain('<Nested');

      // Code blocks
      expect(output).toContain('```js');
      expect(output).toContain('```python');

      // Lists
      expect(output).toContain('First item');
      expect(output).toContain('Step one');
    });
  });
});

// =============================================================================
// Error handling: malformed MDX
// =============================================================================

describe('error handling', () => {
  it('handles empty input', () => {
    const { blocks } = deserialize('');
    expect(blocks).toEqual([]);
  });

  it('handles whitespace-only input', () => {
    const { blocks } = deserialize('   \n\n  \n');
    expect(blocks).toEqual([]);
  });

  it('handles frontmatter only, no body', () => {
    const { blocks, frontmatter } = deserialize('---\ntitle: Empty\n---\n');
    expect(frontmatter?.title).toBe('Empty');
    expect(blocks).toEqual([]);
  });

  it('handles unclosed frontmatter gracefully', () => {
    // Unclosed --- should be treated as content, not crash
    expect(() => deserialize('---\ntitle: Broken\nno closing fence')).not.toThrow();
  });

  it('handles plain text without any MDX features', () => {
    const { blocks } = deserialize('Just plain text.');
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toBe('Just plain text.');
  });

  it('handles very long single-line paragraphs', () => {
    const longLine = 'word '.repeat(10000).trim();
    const { blocks } = deserialize(longLine);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('text');
  });

  it('handles consecutive headings without content between them', () => {
    const { blocks } = deserialize('# One\n\n## Two\n\n### Three');
    const headings = findBlocks(blocks, 'heading');
    expect(headings.length).toBe(3);
  });

  it('handles import-like text that is not ESM', () => {
    // These should be paragraphs, not ESM
    const { blocks } = deserialize('importing things is fun.\n\nexporting is also neat.');
    expect(findBlocks(blocks, 'esm').length).toBe(0);
    expect(findBlocks(blocks, 'text').length).toBe(2);
  });
});
