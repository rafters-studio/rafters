import { describe, expect, it } from 'vitest';
import type { SerializerBlock } from './serializer';
import { createHtmlSerializer, htmlSerializer } from './serializer-html';
import type { InlineContent } from './types';

function deserialize(input: string) {
  return htmlSerializer.deserialize(input);
}

function serialize(blocks: SerializerBlock[]) {
  return htmlSerializer.serialize(blocks);
}

describe('createHtmlSerializer', () => {
  it('has correct id and extensions', () => {
    const html = createHtmlSerializer();
    expect(html.id).toBe('html');
    expect(html.extensions).toEqual(['.html', '.htm']);
  });
});

describe('deserialize HTML', () => {
  it('parses headings', () => {
    const { blocks } = deserialize('<h1>Hello</h1>');
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].content).toBe('Hello');
    expect(blocks[0].meta?.level).toBe(1);
  });

  it('parses h2-h4', () => {
    const { blocks } = deserialize('<h2>Two</h2><h3>Three</h3><h4>Four</h4>');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].meta?.level).toBe(2);
    expect(blocks[1].meta?.level).toBe(3);
    expect(blocks[2].meta?.level).toBe(4);
  });

  it('parses paragraphs', () => {
    const { blocks } = deserialize('<p>Hello world</p>');
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toBe('Hello world');
  });

  it('parses bold', () => {
    const { blocks } = deserialize('<p>Hello <strong>bold</strong> world</p>');
    const content = blocks[0].content as InlineContent[];
    expect(content.find((s) => s.marks?.includes('bold'))?.text).toBe('bold');
  });

  it('parses italic', () => {
    const { blocks } = deserialize('<p>Hello <em>italic</em> world</p>');
    const content = blocks[0].content as InlineContent[];
    expect(content.find((s) => s.marks?.includes('italic'))?.text).toBe('italic');
  });

  it('parses inline code', () => {
    const { blocks } = deserialize('<p>Use <code>const</code> here</p>');
    const content = blocks[0].content as InlineContent[];
    expect(content.find((s) => s.marks?.includes('code'))?.text).toBe('const');
  });

  it('parses links', () => {
    const { blocks } = deserialize('<p>Click <a href="https://example.com">here</a></p>');
    const content = blocks[0].content as InlineContent[];
    const link = content.find((s) => s.marks?.includes('link'));
    expect(link?.text).toBe('here');
    expect(link?.href).toBe('https://example.com');
  });

  it('parses strikethrough (del, s, strike)', () => {
    for (const tag of ['del', 's', 'strike']) {
      const { blocks } = deserialize(`<p><${tag}>removed</${tag}></p>`);
      const content = blocks[0].content as InlineContent[];
      expect(content.find((s) => s.marks?.includes('strikethrough'))?.text).toBe('removed');
    }
  });

  it('parses nested marks', () => {
    const { blocks } = deserialize('<p><strong><em>bold italic</em></strong></p>');
    const content = blocks[0].content as InlineContent[];
    const segment = content[0];
    expect(segment?.marks).toContain('bold');
    expect(segment?.marks).toContain('italic');
  });

  it('parses code blocks', () => {
    const { blocks } = deserialize('<pre><code class="language-ts">const x = 1;</code></pre>');
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].content).toBe('const x = 1;');
    expect(blocks[0].meta?.language).toBe('ts');
  });

  it('parses code blocks without language', () => {
    const { blocks } = deserialize('<pre><code>some code</code></pre>');
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].content).toBe('some code');
  });

  it('parses blockquotes', () => {
    const { blocks } = deserialize('<blockquote>A wise quote</blockquote>');
    expect(blocks[0].type).toBe('quote');
  });

  it('parses unordered lists', () => {
    const { blocks } = deserialize('<ul><li>One</li><li>Two</li><li>Three</li></ul>');
    const list = blocks.find((b) => b.type === 'list');
    expect(list?.meta?.ordered).toBe(false);
    expect(list?.children).toHaveLength(3);
    const items = blocks.filter((b) => b.type === 'list-item');
    expect(items[0].content).toBe('One');
  });

  it('parses ordered lists', () => {
    const { blocks } = deserialize('<ol><li>First</li><li>Second</li></ol>');
    const list = blocks.find((b) => b.type === 'list');
    expect(list?.meta?.ordered).toBe(true);
  });

  it('parses horizontal rules', () => {
    const { blocks } = deserialize('<hr />');
    expect(blocks[0].type).toBe('divider');
  });

  it('parses images', () => {
    const { blocks } = deserialize('<img src="https://example.com/img.png" alt="My image" />');
    expect(blocks[0].type).toBe('image');
    expect(blocks[0].meta?.src).toBe('https://example.com/img.png');
    expect(blocks[0].meta?.alt).toBe('My image');
  });

  it('decodes HTML entities', () => {
    const { blocks } = deserialize('<p>Tom &amp; Jerry &lt;3 &quot;fun&quot;</p>');
    expect(blocks[0].content).toBe('Tom & Jerry <3 "fun"');
  });

  it('strips Word/Office markup', () => {
    const wordHtml = `
      <!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]-->
      <p style="mso-style-type:export-only">Hello from Word</p>
      <o:p>&nbsp;</o:p>
    `;
    const { blocks } = deserialize(wordHtml);
    const text = blocks.find((b) => b.type === 'text');
    expect(text?.content).toContain('Hello from Word');
  });

  it('handles empty input', () => {
    const { blocks } = deserialize('');
    expect(blocks).toEqual([]);
  });

  it('handles plain text without HTML', () => {
    const { blocks } = deserialize('Just text');
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].content).toBe('Just text');
  });
});

describe('serialize HTML', () => {
  it('serializes headings', () => {
    const output = serialize([{ id: '1', type: 'heading', content: 'Hello', meta: { level: 2 } }]);
    expect(output).toBe('<h2>Hello</h2>');
  });

  it('serializes paragraphs', () => {
    const output = serialize([{ id: '1', type: 'text', content: 'Hello world' }]);
    expect(output).toBe('<p>Hello world</p>');
  });

  it('serializes inline marks', () => {
    const content: InlineContent[] = [
      { text: 'Hello ' },
      { text: 'bold', marks: ['bold'] },
      { text: ' and ' },
      { text: 'italic', marks: ['italic'] },
    ];
    const output = serialize([{ id: '1', type: 'text', content }]);
    expect(output).toContain('<strong>bold</strong>');
    expect(output).toContain('<em>italic</em>');
  });

  it('serializes links', () => {
    const content: InlineContent[] = [
      { text: 'click ', marks: [] },
      { text: 'here', marks: ['link'], href: 'https://example.com' },
    ];
    const output = serialize([{ id: '1', type: 'text', content }]);
    expect(output).toContain('<a href="https://example.com">here</a>');
  });

  it('serializes code blocks', () => {
    const output = serialize([
      { id: '1', type: 'code', content: 'const x = 1;', meta: { language: 'ts' } },
    ]);
    expect(output).toContain('<pre><code class="language-ts">');
    expect(output).toContain('const x = 1;');
  });

  it('serializes dividers', () => {
    const output = serialize([{ id: '1', type: 'divider' }]);
    expect(output).toBe('<hr />');
  });

  it('serializes images', () => {
    const output = serialize([
      { id: '1', type: 'image', meta: { src: 'https://example.com/img.png', alt: 'Image' } },
    ]);
    expect(output).toContain('<img src="https://example.com/img.png" alt="Image" />');
  });

  it('serializes lists', () => {
    const blocks: SerializerBlock[] = [
      { id: 'i1', type: 'list-item', content: 'One', parentId: 'l1' },
      { id: 'i2', type: 'list-item', content: 'Two', parentId: 'l1' },
      { id: 'l1', type: 'list', meta: { ordered: false }, children: ['i1', 'i2'] },
    ];
    const output = serialize(blocks);
    expect(output).toContain('<ul>');
    expect(output).toContain('<li>One</li>');
    expect(output).toContain('<li>Two</li>');
  });

  it('encodes special characters', () => {
    const output = serialize([{ id: '1', type: 'text', content: 'Tom & Jerry <3' }]);
    expect(output).toContain('&amp;');
    expect(output).toContain('&lt;');
  });
});

describe('round-trip', () => {
  it('preserves headings', () => {
    const html = '<h1>Hello</h1>';
    const { blocks } = deserialize(html);
    const output = serialize(blocks);
    expect(output).toContain('<h1>Hello</h1>');
  });

  it('preserves paragraphs with marks', () => {
    const html = '<p>Hello <strong>bold</strong> and <em>italic</em></p>';
    const { blocks } = deserialize(html);
    const output = serialize(blocks);
    expect(output).toContain('<strong>bold</strong>');
    expect(output).toContain('<em>italic</em>');
  });

  it('preserves lists', () => {
    const html = '<ul><li>One</li><li>Two</li></ul>';
    const { blocks } = deserialize(html);
    const output = serialize(blocks);
    expect(output).toContain('<ul>');
    expect(output).toContain('<li>One</li>');
  });

  it('preserves code blocks with language', () => {
    const html = '<pre><code class="language-js">const x = 1;</code></pre>';
    const { blocks } = deserialize(html);
    const output = serialize(blocks);
    expect(output).toContain('language-js');
    expect(output).toContain('const x = 1;');
  });
});
