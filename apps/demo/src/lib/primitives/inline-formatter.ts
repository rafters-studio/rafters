/**
 * Inline Formatter primitive
 * Manages inline formatting (bold, italic, code, etc.) for contenteditable elements
 *
 * WCAG Compliance:
 * - 1.3.1 Info and Relationships (Level A): Semantic HTML tags convey meaning
 * - 4.1.2 Name, Role, Value (Level A): Proper semantic markup for AT
 *
 * @example
 * ```typescript
 * const formatter = createInlineFormatter({
 *   container: contentEditableElement,
 *   formats: [BOLD, ITALIC, CODE],
 * });
 *
 * // Apply bold to current selection
 * formatter.applyFormat('bold');
 *
 * // Toggle italic (removes if already applied)
 * formatter.toggleFormat('italic');
 *
 * // Get active formats at selection
 * const active = formatter.getActiveFormats();
 * ```
 */

import type {
  CleanupFunction,
  FormatDefinition,
  InlineContent,
  InlineMark,
} from '@/lib/primitives/types';

/**
 * Default format definitions for common inline marks
 */
export const BOLD: FormatDefinition = {
  name: 'bold',
  tag: 'strong',
  shortcut: 'Mod+B',
};

export const ITALIC: FormatDefinition = {
  name: 'italic',
  tag: 'em',
  shortcut: 'Mod+I',
};

export const CODE: FormatDefinition = {
  name: 'code',
  tag: 'code',
};

export const STRIKETHROUGH: FormatDefinition = {
  name: 'strikethrough',
  tag: 's',
};

export const LINK: FormatDefinition = {
  name: 'link',
  tag: 'a',
};

/**
 * Options for inline formatter
 */
export interface InlineFormatterOptions {
  /**
   * The contenteditable element to manage formatting for
   */
  container: HTMLElement;

  /**
   * Format definitions to support
   */
  formats: FormatDefinition[];
}

/**
 * Inline formatter controller interface
 */
export interface InlineFormatterController {
  /**
   * Get all active formats at the current selection
   * Returns empty array if no selection or selection is outside container
   */
  getActiveFormats: () => InlineMark[];

  /**
   * Check if a specific format is active at the current selection
   * Returns true only if the entire selection has the format
   */
  isFormatActive: (format: InlineMark) => boolean;

  /**
   * Toggle a format on/off
   * Removes format if entire selection has it, applies otherwise
   */
  toggleFormat: (format: InlineMark, href?: string) => void;

  /**
   * Apply a format to the current selection
   */
  applyFormat: (format: InlineMark, href?: string) => void;

  /**
   * Remove a format from the current selection
   */
  removeFormat: (format: InlineMark) => void;

  /**
   * Remove all formatting from the current selection
   */
  removeAllFormatting: () => void;

  /**
   * Serialize the current selection to InlineContent array
   */
  serializeSelection: () => InlineContent[];

  /**
   * Deserialize InlineContent array to DOM nodes
   * Returns a DocumentFragment containing the nodes
   */
  deserializeToDOM: (content: InlineContent[]) => DocumentFragment;

  /**
   * Cleanup function
   */
  cleanup: CleanupFunction;
}

/**
 * Map tag names to format names (lowercase for comparison)
 */
function createTagToFormatMap(formats: FormatDefinition[]): Map<string, InlineMark> {
  const map = new Map<string, InlineMark>();
  for (const format of formats) {
    map.set(format.tag.toLowerCase(), format.name);
  }
  return map;
}

/**
 * Map format names to format definitions
 */
function createFormatMap(formats: FormatDefinition[]): Map<InlineMark, FormatDefinition> {
  const map = new Map<InlineMark, FormatDefinition>();
  for (const format of formats) {
    map.set(format.name, format);
  }
  return map;
}

/**
 * Get the formats applied to a specific node by traversing up the tree
 */
function getFormatsAtNode(
  node: Node,
  container: HTMLElement,
  tagToFormat: Map<string, InlineMark>,
): Set<InlineMark> {
  const formats = new Set<InlineMark>();
  let current: Node | null = node;

  while (current && current !== container) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const format = tagToFormat.get(tagName);
      if (format !== undefined) {
        formats.add(format);
      }
    }
    current = current.parentNode;
  }

  return formats;
}

/**
 * Check if a node is inside a container
 */
function isNodeInContainer(node: Node | null, container: HTMLElement): boolean {
  if (!node) return false;
  return container.contains(node);
}

/**
 * Get all text nodes within a range
 */
function getTextNodesInRange(range: Range): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);

      // Check if this text node intersects with the range
      if (
        range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 &&
        range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0
      ) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    },
  });

  let node = walker.nextNode();
  while (node !== null) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  // Handle case where start/end containers are text nodes
  if (
    range.startContainer.nodeType === Node.TEXT_NODE &&
    !textNodes.includes(range.startContainer as Text)
  ) {
    textNodes.unshift(range.startContainer as Text);
  }
  if (
    range.endContainer.nodeType === Node.TEXT_NODE &&
    !textNodes.includes(range.endContainer as Text)
  ) {
    textNodes.push(range.endContainer as Text);
  }

  return textNodes;
}

/**
 * Find the closest ancestor element with a specific tag
 */
function findAncestorWithTag(
  node: Node,
  tagName: string,
  container: HTMLElement,
): HTMLElement | null {
  let current: Node | null = node;
  const lowerTag = tagName.toLowerCase();

  while (current && current !== container) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      (current as HTMLElement).tagName.toLowerCase() === lowerTag
    ) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }

  return null;
}

/**
 * Wrap a range with a format element
 */
function wrapRangeWithFormat(
  range: Range,
  format: FormatDefinition,
  container: HTMLElement,
  href?: string,
): void {
  const element = document.createElement(format.tag);

  if (format.class) {
    element.className = format.class;
  }

  if (format.attributes) {
    for (const [key, value] of Object.entries(format.attributes)) {
      element.setAttribute(key, value);
    }
  }

  if (format.name === 'link' && href) {
    element.setAttribute('href', href);
  }

  // Handle collapsed range (just insert empty element)
  if (range.collapsed) {
    range.insertNode(element);
    // Place cursor inside
    range.selectNodeContents(element);
    range.collapse(true);
    return;
  }

  // Extract contents and wrap
  const contents = range.extractContents();
  element.appendChild(contents);
  range.insertNode(element);

  // Normalize to merge adjacent text nodes
  if (container.normalize) {
    container.normalize();
  }
}

/**
 * Unwrap a format element, keeping its contents
 */
function unwrapFormatElement(element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;

  // Move all children before the element
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  // Remove the now-empty element
  parent.removeChild(element);

  // Normalize to merge adjacent text nodes
  (parent as HTMLElement).normalize();
}

/**
 * Remove format from a range
 */
function removeFormatFromRange(
  range: Range,
  format: FormatDefinition,
  container: HTMLElement,
): void {
  if (range.collapsed) {
    return;
  }

  const textNodes = getTextNodesInRange(range);

  for (const textNode of textNodes) {
    const formatElement = findAncestorWithTag(textNode, format.tag, container);
    if (formatElement) {
      // Check if we need to split the format element
      const formatRange = document.createRange();
      formatRange.selectNodeContents(formatElement);

      const startsBeforeSelection =
        range.compareBoundaryPoints(Range.START_TO_START, formatRange) > 0;
      const endsAfterSelection = range.compareBoundaryPoints(Range.END_TO_END, formatRange) < 0;

      if (startsBeforeSelection || endsAfterSelection) {
        // Need to split - extract the portion in the range
        const selectedRange = document.createRange();
        selectedRange.selectNodeContents(textNode);

        // Clamp to the original range
        if (range.compareBoundaryPoints(Range.START_TO_START, selectedRange) > 0) {
          selectedRange.setStart(range.startContainer, range.startOffset);
        }
        if (range.compareBoundaryPoints(Range.END_TO_END, selectedRange) < 0) {
          selectedRange.setEnd(range.endContainer, range.endOffset);
        }

        // For partial unwrap, we need to restructure the DOM
        // This is complex - for now, we'll handle the simple case
        // where we can just unwrap the entire element
        unwrapFormatElement(formatElement);
      } else {
        // Format element is fully contained in selection
        unwrapFormatElement(formatElement);
      }
    }
  }

  container.normalize();
}

/**
 * Create inline formatter for a contenteditable element
 *
 * @example
 * ```typescript
 * const formatter = createInlineFormatter({
 *   container: editorElement,
 *   formats: [BOLD, ITALIC, CODE, LINK],
 * });
 *
 * // Check active formats
 * const active = formatter.getActiveFormats();
 * console.log('Active:', active);
 *
 * // Apply bold
 * formatter.applyFormat('bold');
 *
 * // Toggle (add if missing, remove if present)
 * formatter.toggleFormat('italic');
 *
 * // Serialize to data
 * const content = formatter.serializeSelection();
 *
 * // Cleanup when done
 * formatter.cleanup();
 * ```
 */
export function createInlineFormatter(options: InlineFormatterOptions): InlineFormatterController {
  // SSR guard - return safe no-op implementation when running on server
  if (typeof window === 'undefined') {
    return {
      getActiveFormats: () => [],
      isFormatActive: () => false,
      toggleFormat: () => {},
      applyFormat: () => {},
      removeFormat: () => {},
      removeAllFormatting: () => {},
      serializeSelection: () => [],
      deserializeToDOM: () => {
        throw new Error(
          'deserializeToDOM cannot be called during server-side rendering. ' +
            'Ensure this method is only called in browser context.',
        );
      },
      cleanup: () => {},
    };
  }

  const { container, formats } = options;
  const tagToFormat = createTagToFormatMap(formats);
  const formatMap = createFormatMap(formats);

  /**
   * Get current selection range within container
   */
  function getSelectionRange(): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    // Check if selection is within container
    if (
      !isNodeInContainer(range.startContainer, container) ||
      !isNodeInContainer(range.endContainer, container)
    ) {
      return null;
    }

    return range;
  }

  /**
   * Get all active formats at the current selection
   */
  function getActiveFormats(): InlineMark[] {
    const range = getSelectionRange();
    if (!range) {
      return [];
    }

    if (range.collapsed) {
      // For collapsed selection, get formats at cursor position
      const formatsAtCursor = getFormatsAtNode(range.startContainer, container, tagToFormat);
      return Array.from(formatsAtCursor);
    }

    // For range selection, find formats that apply to the entire range
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 0) {
      // Check the start container if no text nodes found
      const formatsAtStart = getFormatsAtNode(range.startContainer, container, tagToFormat);
      return Array.from(formatsAtStart);
    }

    // Get formats at first node
    const firstNode = textNodes[0];
    if (!firstNode) {
      return [];
    }
    let commonFormats = getFormatsAtNode(firstNode, container, tagToFormat);

    // Intersect with formats at all other nodes
    for (let i = 1; i < textNodes.length; i++) {
      const node = textNodes[i];
      if (!node) continue;
      const nodeFormats = getFormatsAtNode(node, container, tagToFormat);
      const intersection = new Set<InlineMark>();
      for (const format of commonFormats) {
        if (nodeFormats.has(format)) {
          intersection.add(format);
        }
      }
      commonFormats = intersection;
    }

    return Array.from(commonFormats);
  }

  /**
   * Check if a specific format is active at the current selection
   */
  function isFormatActive(format: InlineMark): boolean {
    return getActiveFormats().includes(format);
  }

  /**
   * Apply a format to the current selection
   */
  function applyFormat(format: InlineMark, href?: string): void {
    const range = getSelectionRange();
    if (!range) {
      return;
    }

    const formatDef = formatMap.get(format);
    if (!formatDef) {
      return;
    }

    // Save selection
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    wrapRangeWithFormat(range, formatDef, container, href);

    // Restore selection to the wrapped content
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Remove a format from the current selection
   */
  function removeFormat(format: InlineMark): void {
    const range = getSelectionRange();
    if (!range) {
      return;
    }

    const formatDef = formatMap.get(format);
    if (!formatDef) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    removeFormatFromRange(range, formatDef, container);

    // Try to restore selection
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Toggle a format on/off
   */
  function toggleFormat(format: InlineMark, href?: string): void {
    if (isFormatActive(format)) {
      removeFormat(format);
    } else {
      applyFormat(format, href);
    }
  }

  /**
   * Remove all formatting from the current selection
   */
  function removeAllFormatting(): void {
    const range = getSelectionRange();
    if (!range || range.collapsed) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    // Get text content
    const text = range.toString();

    // Find the common ancestor that contains the selection
    const commonAncestor = range.commonAncestorContainer;

    // Delete the range content
    range.deleteContents();

    // Clean up empty formatting elements
    // Walk up from the common ancestor and remove empty format elements
    let current: Node | null = commonAncestor;
    while (current && current !== container) {
      const parent: Node | null = current.parentNode;
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        tagToFormat.has((current as HTMLElement).tagName.toLowerCase()) &&
        current.textContent === ''
      ) {
        parent?.removeChild(current);
      }
      current = parent;
    }

    // Insert plain text at the container level or where appropriate
    const textNode = document.createTextNode(text);

    // Find a good insertion point
    if (container.childNodes.length === 0) {
      container.appendChild(textNode);
    } else {
      range.insertNode(textNode);
    }

    // Select the new text node
    range.selectNodeContents(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    container.normalize();
  }

  /**
   * Serialize the current selection to InlineContent array
   */
  function serializeSelection(): InlineContent[] {
    const range = getSelectionRange();
    if (!range) {
      return [];
    }

    const result: InlineContent[] = [];
    const textNodes = getTextNodesInRange(range);

    for (const textNode of textNodes) {
      // Determine the actual text to include from this node
      let startOffset = 0;
      let endOffset = textNode.length;

      if (textNode === range.startContainer) {
        startOffset = range.startOffset;
      }
      if (textNode === range.endContainer) {
        endOffset = range.endOffset;
      }

      const text = textNode.textContent?.slice(startOffset, endOffset) ?? '';
      if (text.length === 0) {
        continue;
      }

      // Get marks for this text node
      const marks = Array.from(getFormatsAtNode(textNode, container, tagToFormat));

      // Check for link href
      let href: string | undefined;
      if (marks.includes('link')) {
        const linkElement = findAncestorWithTag(textNode, 'a', container);
        if (linkElement) {
          href = linkElement.getAttribute('href') ?? undefined;
        }
      }

      const content: InlineContent = { text };
      if (marks.length > 0) {
        content.marks = marks;
      }
      if (href !== undefined) {
        content.href = href;
      }

      result.push(content);
    }

    return result;
  }

  /**
   * Deserialize InlineContent array to DOM nodes
   */
  function deserializeToDOM(content: InlineContent[]): DocumentFragment {
    const fragment = document.createDocumentFragment();

    for (const item of content) {
      let node: Node = document.createTextNode(item.text);

      // Wrap with format elements (in reverse order so innermost is first applied)
      const marks = item.marks ?? [];
      for (const mark of marks) {
        const formatDef = formatMap.get(mark);
        if (formatDef) {
          const element = document.createElement(formatDef.tag);

          if (formatDef.class) {
            element.className = formatDef.class;
          }

          if (formatDef.attributes) {
            for (const [key, value] of Object.entries(formatDef.attributes)) {
              element.setAttribute(key, value);
            }
          }

          if (mark === 'link' && item.href) {
            element.setAttribute('href', item.href);
          }

          element.appendChild(node);
          node = element;
        }
      }

      fragment.appendChild(node);
    }

    return fragment;
  }

  /**
   * Cleanup function
   */
  function cleanup(): void {
    // Currently no event listeners to clean up
    // Reserved for future use (e.g., keyboard shortcuts)
  }

  return {
    getActiveFormats,
    isFormatActive,
    toggleFormat,
    applyFormat,
    removeFormat,
    removeAllFormatting,
    serializeSelection,
    deserializeToDOM,
    cleanup,
  };
}
