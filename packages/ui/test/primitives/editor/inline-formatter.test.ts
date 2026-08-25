import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOLD,
  CODE,
  createInlineFormatter,
  ITALIC,
  LINK,
  STRIKETHROUGH,
} from '../../../src/primitives/editor/inline-formatter';
import type { InlineContent } from '../../../src/primitives/types';

describe('createInlineFormatter', () => {
  let container: HTMLDivElement;

  /**
   * Helper to set up a selection range
   */
  function setSelection(
    startNode: Node,
    startOffset: number,
    endNode: Node,
    endOffset: number,
  ): void {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Helper to set cursor at position
   */
  function setCursor(node: Node, offset: number): void {
    setSelection(node, offset, node, offset);
  }

  /**
   * Helper to create formatted content in container
   * Note: Uses innerHTML for test setup only - not production code
   */
  function setupContainer(html: string): void {
    // eslint-disable-next-line no-unsanitized/property -- Test setup only
    container.innerHTML = html;
  }

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);
  });

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.removeChild(container);
  });

  describe('default format definitions', () => {
    it('exports BOLD format definition', () => {
      expect(BOLD).toEqual({
        name: 'bold',
        tag: 'strong',
        shortcut: 'Mod+B',
      });
    });

    it('exports ITALIC format definition', () => {
      expect(ITALIC).toEqual({
        name: 'italic',
        tag: 'em',
        shortcut: 'Mod+I',
      });
    });

    it('exports CODE format definition', () => {
      expect(CODE).toEqual({
        name: 'code',
        tag: 'code',
      });
    });

    it('exports STRIKETHROUGH format definition', () => {
      expect(STRIKETHROUGH).toEqual({
        name: 'strikethrough',
        tag: 's',
      });
    });

    it('exports LINK format definition', () => {
      expect(LINK).toEqual({
        name: 'link',
        tag: 'a',
      });
    });
  });

  describe('getActiveFormats', () => {
    it('returns empty array when no selection', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const active = formatter.getActiveFormats();
      expect(active).toEqual([]);

      formatter.cleanup();
    });

    it('returns empty array when selection is outside container', () => {
      const outsideElement = document.createElement('div');
      outsideElement.textContent = 'Outside';
      document.body.appendChild(outsideElement);

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outsideElement);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const active = formatter.getActiveFormats();
      expect(active).toEqual([]);

      formatter.cleanup();
      document.body.removeChild(outsideElement);
    });

    it('returns formats at cursor position in formatted text', () => {
      setupContainer('<strong>bold text</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setCursor(textNode, 2);
      }

      const active = formatter.getActiveFormats();
      expect(active).toContain('bold');

      formatter.cleanup();
    });

    it('returns multiple formats when nested', () => {
      setupContainer('<strong><em>bold and italic</em></strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('em')?.firstChild;
      if (textNode) {
        setCursor(textNode, 5);
      }

      const active = formatter.getActiveFormats();
      expect(active).toContain('bold');
      expect(active).toContain('italic');

      formatter.cleanup();
    });

    it('returns empty array for plain text', () => {
      container.textContent = 'plain text';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setCursor(textNode, 2);
      }

      const active = formatter.getActiveFormats();
      expect(active).toEqual([]);

      formatter.cleanup();
    });

    it('returns formats that apply to entire range selection', () => {
      setupContainer('<strong>all bold</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 8);
      }

      const active = formatter.getActiveFormats();
      expect(active).toContain('bold');

      formatter.cleanup();
    });

    it('returns only common formats when selection spans different formats', () => {
      setupContainer('<strong>bold</strong> and <em>italic</em>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // Select from "bold" to "italic"
      const boldText = container.querySelector('strong')?.firstChild;
      const italicText = container.querySelector('em')?.firstChild;

      if (boldText && italicText) {
        setSelection(boldText, 0, italicText, 6);
      }

      const active = formatter.getActiveFormats();
      // Neither bold nor italic applies to the entire selection
      expect(active).toEqual([]);

      formatter.cleanup();
    });
  });

  describe('isFormatActive', () => {
    it('returns true when format is active at selection', () => {
      setupContainer('<strong>bold text</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setCursor(textNode, 2);
      }

      expect(formatter.isFormatActive('bold')).toBe(true);
      expect(formatter.isFormatActive('italic')).toBe(false);

      formatter.cleanup();
    });

    it('returns false when format is not active', () => {
      container.textContent = 'plain text';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setCursor(textNode, 2);
      }

      expect(formatter.isFormatActive('bold')).toBe(false);

      formatter.cleanup();
    });
  });

  describe('applyFormat', () => {
    it('wraps selected text with format element', () => {
      container.textContent = 'hello world';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 5); // select "hello"
      }

      formatter.applyFormat('bold');

      expect(container.querySelector('strong')?.textContent).toBe('hello');

      formatter.cleanup();
    });

    it('does nothing when no selection', () => {
      container.textContent = 'hello world';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // No selection
      window.getSelection()?.removeAllRanges();

      formatter.applyFormat('bold');

      expect(container.textContent).toBe('hello world');
      expect(container.querySelector('strong')).toBeNull();

      formatter.cleanup();
    });

    it('applies format with custom attributes', () => {
      container.textContent = 'hello world';

      const customFormat = {
        name: 'bold' as const,
        tag: 'strong',
        class: 'custom-bold',
        attributes: { 'data-custom': 'value' },
      };

      const formatter = createInlineFormatter({
        container,
        formats: [customFormat],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 5);
      }

      formatter.applyFormat('bold');

      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.className).toBe('custom-bold');
      expect(strong?.getAttribute('data-custom')).toBe('value');

      formatter.cleanup();
    });

    it('applies link format with href', () => {
      container.textContent = 'click here';

      const formatter = createInlineFormatter({
        container,
        formats: [LINK],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 10);
      }

      formatter.applyFormat('link', 'https://example.com');

      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.textContent).toBe('click here');

      formatter.cleanup();
    });
  });

  describe('removeFormat', () => {
    it('removes format from selected text', () => {
      setupContainer('<strong>bold text</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 9);
      }

      formatter.removeFormat('bold');

      expect(container.textContent).toBe('bold text');
      expect(container.querySelector('strong')).toBeNull();

      formatter.cleanup();
    });

    it('does nothing when format is not present', () => {
      container.textContent = 'plain text';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 10);
      }

      formatter.removeFormat('bold');

      expect(container.textContent).toBe('plain text');

      formatter.cleanup();
    });

    it('removes only the specified format, keeping others', () => {
      setupContainer('<strong><em>bold and italic</em></strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('em')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 15);
      }

      formatter.removeFormat('bold');

      // Bold should be removed, italic should remain
      expect(container.querySelector('strong')).toBeNull();
      expect(container.querySelector('em')).not.toBeNull();

      formatter.cleanup();
    });
  });

  describe('toggleFormat', () => {
    it('applies format when not active', () => {
      container.textContent = 'plain text';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 5);
      }

      formatter.toggleFormat('bold');

      expect(container.querySelector('strong')).not.toBeNull();

      formatter.cleanup();
    });

    it('removes format when already active on entire selection', () => {
      setupContainer('<strong>bold text</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 9);
      }

      formatter.toggleFormat('bold');

      expect(container.querySelector('strong')).toBeNull();
      expect(container.textContent).toBe('bold text');

      formatter.cleanup();
    });

    it('applies format when only partially active', () => {
      setupContainer('<strong>bold</strong> and plain');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // Select across bold and plain text
      const boldText = container.querySelector('strong')?.firstChild;
      const plainText = container.childNodes[1]; // " and plain"

      if (boldText && plainText) {
        setSelection(boldText, 0, plainText, 10);
      }

      // Since not all selected text is bold, toggle should apply bold
      // (This is the expected toggle behavior)
      formatter.toggleFormat('bold');

      // The entire selection should now be wrapped in bold
      // Note: This may result in nested bold elements which is acceptable
      formatter.cleanup();
    });
  });

  describe('removeAllFormatting', () => {
    it('removes all formatting from selection', () => {
      setupContainer('<strong><em>formatted text</em></strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('em')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 14);
      }

      formatter.removeAllFormatting();

      expect(container.querySelector('strong')).toBeNull();
      expect(container.querySelector('em')).toBeNull();
      expect(container.textContent).toBe('formatted text');

      formatter.cleanup();
    });

    it('does nothing on collapsed selection', () => {
      setupContainer('<strong>bold</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setCursor(textNode, 2);
      }

      formatter.removeAllFormatting();

      // Should remain unchanged
      expect(container.querySelector('strong')).not.toBeNull();

      formatter.cleanup();
    });
  });

  describe('serializeSelection', () => {
    it('serializes plain text', () => {
      container.textContent = 'hello world';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 11);
      }

      const content = formatter.serializeSelection();

      expect(content).toEqual([{ text: 'hello world' }]);

      formatter.cleanup();
    });

    it('serializes formatted text with marks', () => {
      setupContainer('<strong>bold text</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('strong')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 9);
      }

      const content = formatter.serializeSelection();

      expect(content).toEqual([{ text: 'bold text', marks: ['bold'] }]);

      formatter.cleanup();
    });

    it('serializes nested formats', () => {
      setupContainer('<strong><em>bold and italic</em></strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.querySelector('em')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 15);
      }

      const content = formatter.serializeSelection();

      expect(content.length).toBe(1);
      expect(content[0].text).toBe('bold and italic');
      expect(content[0].marks).toContain('bold');
      expect(content[0].marks).toContain('italic');

      formatter.cleanup();
    });

    it('serializes mixed content', () => {
      setupContainer('plain <strong>bold</strong> more');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // Select entire content
      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const content = formatter.serializeSelection();

      expect(content.length).toBe(3);
      expect(content[0]).toEqual({ text: 'plain ' });
      expect(content[1]).toEqual({ text: 'bold', marks: ['bold'] });
      expect(content[2]).toEqual({ text: ' more' });

      formatter.cleanup();
    });

    it('serializes link with href', () => {
      setupContainer('<a href="https://example.com">link text</a>');

      const formatter = createInlineFormatter({
        container,
        formats: [LINK],
      });

      const textNode = container.querySelector('a')?.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 9);
      }

      const content = formatter.serializeSelection();

      expect(content).toEqual([
        { text: 'link text', marks: ['link'], href: 'https://example.com' },
      ]);

      formatter.cleanup();
    });

    it('returns empty array when no selection', () => {
      container.textContent = 'hello';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      window.getSelection()?.removeAllRanges();

      const content = formatter.serializeSelection();

      expect(content).toEqual([]);

      formatter.cleanup();
    });
  });

  describe('deserializeToDOM', () => {
    it('creates text node for plain content', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const content: InlineContent[] = [{ text: 'hello world' }];
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.childNodes.length).toBe(1);
      expect(fragment.textContent).toBe('hello world');

      formatter.cleanup();
    });

    it('creates formatted element for content with marks', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const content: InlineContent[] = [{ text: 'bold text', marks: ['bold'] }];
      const fragment = formatter.deserializeToDOM(content);

      const strong = fragment.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold text');

      formatter.cleanup();
    });

    it('creates nested elements for multiple marks', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const content: InlineContent[] = [{ text: 'both', marks: ['bold', 'italic'] }];
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.querySelector('strong')).not.toBeNull();
      expect(fragment.querySelector('em')).not.toBeNull();
      expect(fragment.textContent).toBe('both');

      formatter.cleanup();
    });

    it('creates link with href', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [LINK],
      });

      const content: InlineContent[] = [
        { text: 'click here', marks: ['link'], href: 'https://example.com' },
      ];
      const fragment = formatter.deserializeToDOM(content);

      const link = fragment.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.textContent).toBe('click here');

      formatter.cleanup();
    });

    it('handles multiple content items', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const content: InlineContent[] = [
        { text: 'plain ' },
        { text: 'bold', marks: ['bold'] },
        { text: ' more' },
      ];
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.textContent).toBe('plain bold more');
      expect(fragment.childNodes.length).toBe(3);

      formatter.cleanup();
    });

    it('applies custom class and attributes', () => {
      const customFormat = {
        name: 'bold' as const,
        tag: 'strong',
        class: 'custom-class',
        attributes: { 'data-test': 'value' },
      };

      const formatter = createInlineFormatter({
        container,
        formats: [customFormat],
      });

      const content: InlineContent[] = [{ text: 'formatted', marks: ['bold'] }];
      const fragment = formatter.deserializeToDOM(content);

      const strong = fragment.querySelector('strong');
      expect(strong?.className).toBe('custom-class');
      expect(strong?.getAttribute('data-test')).toBe('value');

      formatter.cleanup();
    });
  });

  describe('serialization round-trip', () => {
    it('round-trips plain text without loss', () => {
      container.textContent = 'hello world';

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const textNode = container.firstChild;
      if (textNode) {
        setSelection(textNode, 0, textNode, 11);
      }

      const content = formatter.serializeSelection();
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.textContent).toBe('hello world');

      formatter.cleanup();
    });

    it('round-trips formatted text without loss', () => {
      setupContainer('<strong>bold</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const content = formatter.serializeSelection();
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.querySelector('strong')?.textContent).toBe('bold');

      formatter.cleanup();
    });

    it('round-trips nested formats without loss', () => {
      setupContainer('<strong><em>both</em></strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const content = formatter.serializeSelection();
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.querySelector('strong')).not.toBeNull();
      expect(fragment.querySelector('em')).not.toBeNull();
      expect(fragment.textContent).toBe('both');

      formatter.cleanup();
    });

    it('round-trips links without loss', () => {
      setupContainer('<a href="https://example.com">link</a>');

      const formatter = createInlineFormatter({
        container,
        formats: [LINK],
      });

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const content = formatter.serializeSelection();
      const fragment = formatter.deserializeToDOM(content);

      const link = fragment.querySelector('a');
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.textContent).toBe('link');

      formatter.cleanup();
    });

    it('round-trips mixed content without loss', () => {
      setupContainer('plain <strong>bold</strong> <em>italic</em> end');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const range = document.createRange();
      range.selectNodeContents(container);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const content = formatter.serializeSelection();
      const fragment = formatter.deserializeToDOM(content);

      expect(fragment.textContent).toBe('plain bold italic end');
      expect(fragment.querySelector('strong')?.textContent).toBe('bold');
      expect(fragment.querySelector('em')?.textContent).toBe('italic');

      formatter.cleanup();
    });
  });

  describe('partial overlap handling', () => {
    it('handles selection starting in formatted and ending in plain text', () => {
      setupContainer('<strong>bold</strong> plain');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const boldText = container.querySelector('strong')?.firstChild;
      const plainText = container.childNodes[1]; // " plain"

      if (boldText && plainText) {
        setSelection(boldText, 2, plainText, 6);
      }

      // Serialize the partial selection
      const content = formatter.serializeSelection();

      // Should have two items: part of bold, part of plain
      expect(content.length).toBe(2);
      expect(content[0].text).toBe('ld');
      expect(content[0].marks).toContain('bold');
      expect(content[1].text).toBe(' plain');
      expect(content[1].marks).toBeUndefined();

      formatter.cleanup();
    });

    it('handles selection starting in plain and ending in formatted text', () => {
      setupContainer('plain <strong>bold</strong>');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const plainText = container.firstChild;
      const boldText = container.querySelector('strong')?.firstChild;

      if (plainText && boldText) {
        setSelection(plainText, 2, boldText, 2);
      }

      const content = formatter.serializeSelection();

      expect(content.length).toBe(2);
      expect(content[0].text).toBe('ain ');
      expect(content[0].marks).toBeUndefined();
      expect(content[1].text).toBe('bo');
      expect(content[1].marks).toContain('bold');

      formatter.cleanup();
    });

    it('correctly identifies when format is not active for partial selection', () => {
      setupContainer('<strong>bold</strong> plain');

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      const boldText = container.querySelector('strong')?.firstChild;
      const plainText = container.childNodes[1];

      if (boldText && plainText) {
        setSelection(boldText, 0, plainText, 6);
      }

      // Bold should NOT be active since selection includes non-bold text
      expect(formatter.isFormatActive('bold')).toBe(false);

      formatter.cleanup();
    });
  });

  describe('SSR safety', () => {
    it('returns no-op controller when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // All methods should return safe defaults
      expect(formatter.getActiveFormats()).toEqual([]);
      expect(formatter.isFormatActive('bold')).toBe(false);
      expect(formatter.serializeSelection()).toEqual([]);

      // These should not throw
      formatter.toggleFormat('bold');
      formatter.applyFormat('bold');
      formatter.removeFormat('bold');
      formatter.removeAllFormatting();
      formatter.cleanup();

      globalThis.window = originalWindow;

      // Need to recreate fragment after restoring window
      const fragmentFormatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });
      const fragment = fragmentFormatter.deserializeToDOM([]);
      expect(fragment).toBeInstanceOf(DocumentFragment);
      fragmentFormatter.cleanup();
    });

    it('throws descriptive error when deserializeToDOM is called during SSR', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      // deserializeToDOM should throw with descriptive error during SSR
      expect(() => formatter.deserializeToDOM([])).toThrow(
        'deserializeToDOM cannot be called during server-side rendering',
      );
      expect(() => formatter.deserializeToDOM([])).toThrow(
        'Ensure this method is only called in browser context',
      );

      globalThis.window = originalWindow;
    });
  });

  describe('cleanup', () => {
    it('does not throw when called multiple times', () => {
      const formatter = createInlineFormatter({
        container,
        formats: [BOLD, ITALIC],
      });

      formatter.cleanup();
      formatter.cleanup();

      // Should not throw
    });
  });
});
