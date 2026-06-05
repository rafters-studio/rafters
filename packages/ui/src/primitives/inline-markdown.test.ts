import { describe, expect, it } from 'vitest';
import { detectInlineMarkdown } from './inline-markdown';

describe('detectInlineMarkdown', () => {
  describe('bold', () => {
    it('detects **text**', () => {
      const content = 'type **bold** here';
      const match = detectInlineMarkdown(content, 13);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 13,
        text: 'bold',
        marks: ['bold'],
      });
    });

    it('detects __text__', () => {
      const content = 'type __bold__ here';
      const match = detectInlineMarkdown(content, 13);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 13,
        text: 'bold',
        marks: ['bold'],
      });
    });

    it('detects bold with spaces inside', () => {
      const content = '**bold text**';
      const match = detectInlineMarkdown(content, 13);
      expect(match).toEqual({
        startOffset: 0,
        endOffset: 13,
        text: 'bold text',
        marks: ['bold'],
      });
    });
  });

  describe('italic', () => {
    it('detects *text*', () => {
      const content = 'type *italic* here';
      const match = detectInlineMarkdown(content, 13);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 13,
        text: 'italic',
        marks: ['italic'],
      });
    });

    it('detects _text_', () => {
      const content = 'type _italic_ here';
      const match = detectInlineMarkdown(content, 13);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 13,
        text: 'italic',
        marks: ['italic'],
      });
    });
  });

  describe('code', () => {
    it('detects `text`', () => {
      const content = 'type `code` here';
      const match = detectInlineMarkdown(content, 11);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 11,
        text: 'code',
        marks: ['code'],
      });
    });

    it('detects code with special characters', () => {
      const content = '`foo.bar()`';
      const match = detectInlineMarkdown(content, 11);
      expect(match).toEqual({
        startOffset: 0,
        endOffset: 11,
        text: 'foo.bar()',
        marks: ['code'],
      });
    });
  });

  describe('strikethrough', () => {
    it('detects ~~text~~', () => {
      const content = 'type ~~struck~~ here';
      const match = detectInlineMarkdown(content, 15);
      expect(match).toEqual({
        startOffset: 5,
        endOffset: 15,
        text: 'struck',
        marks: ['strikethrough'],
      });
    });
  });

  describe('link', () => {
    it('detects [text](url)', () => {
      const content = 'see [docs](https://example.com) here';
      const match = detectInlineMarkdown(content, 31);
      expect(match).toEqual({
        startOffset: 4,
        endOffset: 31,
        text: 'docs',
        marks: ['link'],
        href: 'https://example.com',
      });
    });
  });

  describe('edge cases', () => {
    it('returns null when no match at cursor', () => {
      const content = 'no **bold** here';
      const match = detectInlineMarkdown(content, 16);
      expect(match).toBeNull();
    });

    it('returns null for empty content between delimiters', () => {
      const content = '****';
      const match = detectInlineMarkdown(content, 4);
      expect(match).toBeNull();
    });

    it('returns null for empty string', () => {
      const match = detectInlineMarkdown('', 0);
      expect(match).toBeNull();
    });

    it('ignores escaped opening delimiter', () => {
      const content = 'type \\*not italic*';
      const match = detectInlineMarkdown(content, 18);
      expect(match).toBeNull();
    });

    it('ignores escaped closing delimiter', () => {
      const content = 'type *not italic\\*';
      const match = detectInlineMarkdown(content, 18);
      expect(match).toBeNull();
    });

    it('detects match at start of string', () => {
      const content = '**bold**';
      const match = detectInlineMarkdown(content, 8);
      expect(match).toEqual({
        startOffset: 0,
        endOffset: 8,
        text: 'bold',
        marks: ['bold'],
      });
    });

    it('detects match at end of string', () => {
      const content = 'end *italic*';
      const match = detectInlineMarkdown(content, 12);
      expect(match).toEqual({
        startOffset: 4,
        endOffset: 12,
        text: 'italic',
        marks: ['italic'],
      });
    });

    it('returns null for unmatched opening delimiter', () => {
      const content = 'type **no close';
      const match = detectInlineMarkdown(content, 15);
      expect(match).toBeNull();
    });

    it('cursor must be at end of match', () => {
      const content = '**bold** and more';
      const match = detectInlineMarkdown(content, 5);
      expect(match).toBeNull();
    });
  });
});
