/**
 * Typography primitives for consistent text styling and hierarchy
 *
 * @cognitive-load 2/10 - Familiar text patterns with clear visual hierarchy
 * @attention-economics Hierarchy guides reading: H1=page title (one per page), H2=sections, H3=subsections, body text flows naturally
 * @trust-building Consistent typography builds readability and professionalism
 * @accessibility Proper heading hierarchy for screen readers; sufficient contrast ratios
 * @semantic-meaning Element mapping: H1-H4=document structure, P=body content, Lead=introductions, Muted=secondary info, Code=technical content
 *
 * @usage-patterns
 * DO: Use H1 once per page for main title
 * DO: Follow heading hierarchy (H1 -> H2 -> H3, never skip)
 * DO: Use Lead for introductory paragraphs
 * DO: Use Muted for supplementary information
 * NEVER: Skip heading levels (H1 -> H3)
 * NEVER: Use headings for styling only (use CSS instead)
 * NEVER: Use multiple H1s on a single page
 *
 * @example
 * ```tsx
 * // Page structure
 * <H1>Page Title</H1>
 * <Lead>This is an introduction to the page content.</Lead>
 *
 * <H2>Section Title</H2>
 * <P>Body paragraph with standard styling.</P>
 *
 * <H3>Subsection</H3>
 * <P>More content here.</P>
 * <Muted>Last updated: Jan 2025</Muted>
 *
 * // Code example
 * <P>Use the <Code>useState</Code> hook for local state.</P>
 *
 * // Blockquote
 * <Blockquote>
 *   "Design is not just what it looks like. Design is how it works."
 * </Blockquote>
 * ```
 */
import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import classy from '../../primitives/classy';
import type { InlineContent, InlineMark } from '../../primitives/types';

// ============================================================================
// Editable Typography Props (R-200)
// ============================================================================

/**
 * Shared editable props for typography components
 * Note: Types include `| undefined` explicitly for exactOptionalPropertyTypes compatibility
 */
export interface EditableTypographyProps {
  /** Enable contenteditable mode */
  editable?: boolean | undefined;
  /** Called when content changes */
  onChange?: ((content: string | InlineContent[]) => void) | undefined;
  /** Called when element gains focus */
  onFocus?: (() => void) | undefined;
  /** Called when element loses focus */
  onBlur?: (() => void) | undefined;
  /** Placeholder shown when empty */
  placeholder?: string | undefined;
  /** Called on key down (for custom handling) */
  onKeyDown?: ((event: React.KeyboardEvent) => void) | undefined;
  /** Called on Enter key (for custom handling) */
  onEnter?: (() => void) | undefined;
  /** Called on Backspace at start (for custom handling) */
  onBackspaceAtStart?: (() => void) | undefined;
}

// ============================================================================
// Typography Classes
// ============================================================================

import { typographyClasses } from './typography.classes';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /** Override the default HTML element */
  as?: React.ElementType;
}

/**
 * Extended props for editable heading components (R-200a)
 * Omits conflicting event handlers from TypographyProps since EditableTypographyProps
 * provides simplified callback signatures for editor use.
 */
export interface EditableHeadingProps
  extends Omit<TypographyProps, 'onChange' | 'onBlur' | 'onFocus' | 'onKeyDown'>,
    EditableTypographyProps {
  /** Content as string for controlled editing */
  children?: React.ReactNode;
}

/**
 * Extended props for editable paragraph components (R-200b)
 * Supports InlineContent[] for rich text with inline formatting.
 */
export interface EditableParagraphProps
  extends Omit<TypographyProps, 'onChange' | 'onBlur' | 'onFocus' | 'onKeyDown'>,
    EditableTypographyProps {
  /** Content as string or InlineContent[] for rich text */
  children?: React.ReactNode;
  /** Called when text selection changes (for InlineToolbar integration) */
  onSelectionChange?: ((selection: SelectionInfo | null) => void) | undefined;
  /** Called when slash command is triggered */
  onSlashCommand?: (() => void) | undefined;
}

/**
 * Selection information for InlineToolbar integration
 */
export interface SelectionInfo {
  /** Selection bounding rect for toolbar positioning */
  rect: { x: number; y: number; width: number; height: number };
  /** Currently selected text */
  text: string;
  /** Active format marks in the selection */
  activeFormats: InlineMark[];
  /** Whether the selection is inside a link */
  hasLink: boolean;
  /** Link URL if selection is in a link */
  linkUrl?: string | undefined;
}

/**
 * Extended props for editable quote components (R-200d)
 * Supports InlineContent[] for the quote body and optional citation editing.
 */
export interface EditableQuoteProps
  extends Omit<TypographyProps, 'onChange' | 'onBlur' | 'onFocus' | 'onKeyDown'>,
    EditableTypographyProps {
  /** Quote content */
  children?: React.ReactNode;
  /** Citation text (e.g., author name, source) */
  citation?: string | undefined;
  /** Called when citation changes */
  onCitationChange?: ((citation: string) => void) | undefined;
  /** Called when text selection changes (for InlineToolbar integration) */
  onSelectionChange?: ((selection: SelectionInfo | null) => void) | undefined;
}

/**
 * List item content for editable lists
 */
export interface ListItem {
  /** Unique identifier for the item */
  id: string;
  /** Item content as string or InlineContent[] */
  content: string | InlineContent[];
  /** Indentation level (0 = top level) */
  indent?: number | undefined;
}

/**
 * Extended props for editable list components (R-200c)
 * Supports ordered and unordered lists with item-level editing.
 */
export interface EditableListProps extends Omit<TypographyProps, 'onChange'> {
  /** List items */
  items: ListItem[];
  /** Whether the list is ordered (numbered) */
  ordered?: boolean | undefined;
  /** Enable editing mode */
  editable?: boolean | undefined;
  /** Called when items change */
  onChange?: ((items: ListItem[]) => void) | undefined;
  /** Called when a new item is added */
  onItemAdd?: ((index: number) => void) | undefined;
  /** Called when an item is removed */
  onItemRemove?: ((index: number) => void) | undefined;
  /** Called when an item is indented */
  onIndent?: ((index: number) => void) | undefined;
  /** Called when an item is outdented */
  onOutdent?: ((index: number) => void) | undefined;
  /** Placeholder for empty items */
  placeholder?: string | undefined;
}

/**
 * Extended props for editable code block components (R-200e)
 * Supports multi-line code with optional syntax highlighting.
 */
export interface EditableCodeBlockProps extends Omit<TypographyProps, 'onChange'> {
  /** Code content */
  children: string;
  /** Programming language for syntax highlighting */
  language?: string | undefined;
  /** Enable editing mode */
  editable?: boolean | undefined;
  /** Called when code changes */
  onChange?: ((code: string) => void) | undefined;
  /** Called when language changes */
  onLanguageChange?: ((language: string) => void) | undefined;
  /** Show line numbers */
  showLineNumbers?: boolean | undefined;
  /** Tab size in spaces */
  tabSize?: number | undefined;
  /** Placeholder when empty */
  placeholder?: string | undefined;
}

// ============================================================================
// Editable Heading Hook (R-200a)
// ============================================================================

/**
 * Hook for contenteditable heading behavior
 */
function useEditableHeading({
  editable,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  onKeyDown,
  onEnter,
  onBackspaceAtStart,
}: EditableTypographyProps) {
  const elementRef = useRef<HTMLElement>(null);
  const lastContentRef = useRef<string>('');

  // Handle input events
  const handleInput = useCallback(() => {
    if (!elementRef.current || !onChange) return;

    const content = elementRef.current.textContent ?? '';
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      onChange(content);
    }
  }, [onChange]);

  // Handle key down events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === 'Enter') {
        // Prevent default line break in headings
        event.preventDefault();
        onEnter?.();
      } else if (event.key === 'Backspace') {
        const selection = window.getSelection();
        const element = elementRef.current;
        if (
          selection &&
          element &&
          selection.isCollapsed &&
          selection.anchorOffset === 0 &&
          selection.anchorNode === element.firstChild
        ) {
          // Cursor is at the start
          onBackspaceAtStart?.();
        }
      }
    },
    [onKeyDown, onEnter, onBackspaceAtStart],
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Handle blur
  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  // Handle paste - strip formatting for headings (plain text only)
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    // Remove line breaks from pasted text
    const singleLine = text.replace(/[\r\n]+/g, ' ');
    insertTextAtSelection(singleLine);
  }, []);

  // Sync content when children change (controlled mode)
  useEffect(() => {
    if (!editable || !elementRef.current) return;

    const element = elementRef.current;
    const currentContent = element.textContent ?? '';
    const expectedContent = lastContentRef.current;

    // Only update DOM if it differs (avoid cursor jumping)
    if (currentContent !== expectedContent && element !== document.activeElement) {
      element.textContent = expectedContent;
    }
  }, [editable]);

  // Build props for the editable element (ref handled separately)
  const editableProps = editable
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onPaste: handlePaste,
        'data-placeholder': placeholder,
        'aria-placeholder': placeholder,
      }
    : {};

  return { editableProps, elementRef };
}

// ============================================================================
// Editable Paragraph Hook (R-200b)
// ============================================================================

/** Mark to HTML tag mapping for rendering InlineContent */
const markToTag: Record<InlineMark, string> = {
  bold: 'strong',
  italic: 'em',
  code: 'code',
  strikethrough: 's',
  link: 'a',
};

/**
 * Convert InlineContent[] to HTML string for contenteditable
 */
function inlineContentToHtml(content: InlineContent[]): string {
  return content
    .map((segment) => {
      let html = escapeHtml(segment.text);

      // Apply marks from innermost to outermost
      const marks = segment.marks ?? [];
      for (const mark of marks) {
        const tag = markToTag[mark];
        if (mark === 'link' && segment.href) {
          html = `<${tag} href="${escapeHtml(segment.href)}">${html}</${tag}>`;
        } else {
          html = `<${tag}>${html}</${tag}>`;
        }
      }
      return html;
    })
    .join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Insert plain text at the current selection using Selection API.
 * This is a modern replacement for the deprecated document.execCommand('insertText').
 */
function insertTextAtSelection(text: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Move caret to immediately after the inserted text
  range.setStartAfter(textNode);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Insert HTML at the current selection using Selection API.
 * This is a modern replacement for the deprecated document.execCommand('insertHTML').
 */
function insertHtmlAtSelection(html: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Create a temporary container to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Insert all child nodes from the temp container
  const fragment = document.createDocumentFragment();
  let lastNode: Node | null = null;
  while (tempDiv.firstChild) {
    lastNode = fragment.appendChild(tempDiv.firstChild);
  }
  range.insertNode(fragment);

  // Move caret to after the last inserted node
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Parse HTML from contenteditable to InlineContent[]
 * Note: Uses innerHTML on a temporary element for parsing, content is sanitized via escapeHtml
 */
function htmlToInlineContent(html: string): InlineContent[] {
  // Create a temporary element to parse the HTML
  const div = document.createElement('div');
  // This innerHTML is safe because we're parsing existing contenteditable content
  // and the output goes through our typed InlineContent structure
  div.innerHTML = html;

  const result: InlineContent[] = [];

  function traverse(node: Node, activeMarks: InlineMark[], href?: string): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) {
        const content: InlineContent = { text };
        if (activeMarks.length > 0) {
          content.marks = [...activeMarks];
        }
        if (activeMarks.includes('link') && href) {
          content.href = href;
        }
        result.push(content);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const newMarks = [...activeMarks];
      let newHref = href;

      // Map tags to marks
      switch (tagName) {
        case 'strong':
        case 'b':
          if (!newMarks.includes('bold')) newMarks.push('bold');
          break;
        case 'em':
        case 'i':
          if (!newMarks.includes('italic')) newMarks.push('italic');
          break;
        case 'code':
          if (!newMarks.includes('code')) newMarks.push('code');
          break;
        case 's':
        case 'strike':
        case 'del':
          if (!newMarks.includes('strikethrough')) newMarks.push('strikethrough');
          break;
        case 'a':
          if (!newMarks.includes('link')) newMarks.push('link');
          newHref = element.getAttribute('href') ?? undefined;
          break;
      }

      // Process children
      for (const child of Array.from(node.childNodes)) {
        traverse(child, newMarks, newHref);
      }
    }
  }

  for (const child of Array.from(div.childNodes)) {
    traverse(child, []);
  }

  return result;
}

/**
 * Get active formats at current selection using DOM traversal.
 * This is a modern replacement for deprecated document.queryCommandState.
 */
function getActiveFormats(): InlineMark[] {
  const formats: InlineMark[] = [];
  if (typeof document === 'undefined') return formats;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return formats;

  // Walk up the DOM tree from selection anchor to find formatting tags
  let node: Node | null = selection.anchorNode;
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = (node as HTMLElement).tagName.toLowerCase();
      // Check for bold (strong/b)
      if ((tagName === 'strong' || tagName === 'b') && !formats.includes('bold')) {
        formats.push('bold');
      }
      // Check for italic (em/i)
      if ((tagName === 'em' || tagName === 'i') && !formats.includes('italic')) {
        formats.push('italic');
      }
      // Check for strikethrough (s/strike/del)
      if (
        (tagName === 's' || tagName === 'strike' || tagName === 'del') &&
        !formats.includes('strikethrough')
      ) {
        formats.push('strikethrough');
      }
      // Check for code
      if (tagName === 'code' && !formats.includes('code')) {
        formats.push('code');
      }
      // Check for link
      if (tagName === 'a' && !formats.includes('link')) {
        formats.push('link');
      }
    }
    node = node.parentNode;
  }

  return formats;
}

/**
 * Get link URL at current selection
 */
function getLinkAtSelection(): string | undefined {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return undefined;

  let node: Node | null = selection.anchorNode;
  while (node && node !== document.body) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).tagName.toLowerCase() === 'a'
    ) {
      return (node as HTMLAnchorElement).href;
    }
    node = node.parentNode;
  }
  return undefined;
}

/**
 * Hook for contenteditable paragraph behavior with InlineContent support
 */
function useEditableParagraph({
  editable,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  onKeyDown,
  onEnter,
  onBackspaceAtStart,
  onSelectionChange,
  onSlashCommand,
}: EditableParagraphProps) {
  const elementRef = useRef<HTMLElement>(null);
  const lastHtmlRef = useRef<string>('');

  // Handle input events
  const handleInput = useCallback(() => {
    if (!elementRef.current || !onChange) return;

    const html = elementRef.current.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      // Convert HTML to InlineContent[]
      const content = htmlToInlineContent(html);
      onChange(content);
    }
  }, [onChange]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!onSelectionChange || !elementRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      onSelectionChange(null);
      return;
    }

    // Check if selection is within our element
    const range = selection.getRangeAt(0);
    if (!elementRef.current.contains(range.commonAncestorContainer)) {
      onSelectionChange(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const activeFormats = getActiveFormats();
    const linkUrl = getLinkAtSelection();

    onSelectionChange({
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      text: selection.toString(),
      activeFormats,
      hasLink: activeFormats.includes('link'),
      linkUrl,
    });
  }, [onSelectionChange]);

  // Set up selection change listener
  useEffect(() => {
    if (!editable || !onSelectionChange) return undefined;

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editable, onSelectionChange, handleSelectionChange]);

  // Handle key down events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      // Check for slash command trigger
      if (event.key === '/' && onSlashCommand) {
        const selection = window.getSelection();
        if (selection?.isCollapsed) {
          // Only trigger at start of element or after whitespace
          const node = selection.anchorNode;
          const offset = selection.anchorOffset;
          if (node && node.nodeType === Node.TEXT_NODE) {
            const textBefore = node.textContent?.slice(0, offset) ?? '';
            if (textBefore === '' || /\s$/.test(textBefore)) {
              onSlashCommand();
            }
          } else if (offset === 0) {
            onSlashCommand();
          }
        }
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        // Regular Enter creates new block
        event.preventDefault();
        onEnter?.();
      } else if (event.key === 'Backspace') {
        const selection = window.getSelection();
        const element = elementRef.current;
        if (selection && element && selection.isCollapsed && selection.anchorOffset === 0) {
          // Check if at the very start of the element
          const range = selection.getRangeAt(0);
          const preRange = document.createRange();
          preRange.selectNodeContents(element);
          preRange.setEnd(range.startContainer, range.startOffset);
          if (preRange.toString() === '') {
            onBackspaceAtStart?.();
          }
        }
      }
    },
    [onKeyDown, onEnter, onBackspaceAtStart, onSlashCommand],
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Handle blur
  const handleBlur = useCallback(() => {
    onBlur?.();
    // Clear selection info on blur
    onSelectionChange?.(null);
  }, [onBlur, onSelectionChange]);

  // Handle paste - preserve formatting for paragraphs
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    // Try to get HTML first, fall back to plain text
    const html = event.clipboardData.getData('text/html');
    if (html) {
      // Sanitize HTML - only keep inline formatting tags
      const tempDiv = document.createElement('div');
      // Parse HTML in temp element for sanitization
      tempDiv.innerHTML = html;

      // Remove block elements, keep only inline formatting
      const cleanHtml = sanitizeInlineHtml(tempDiv);
      insertHtmlAtSelection(cleanHtml);
    } else {
      const text = event.clipboardData.getData('text/plain');
      insertTextAtSelection(text);
    }
  }, []);

  // Build props for the editable element
  const editableProps = editable
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onPaste: handlePaste,
        'data-placeholder': placeholder,
        'aria-placeholder': placeholder,
      }
    : {};

  return { editableProps, elementRef };
}

/**
 * Sanitize HTML to keep only inline formatting
 * Returns safe HTML with only allowed inline tags
 */
function sanitizeInlineHtml(element: HTMLElement): string {
  const allowedTags = new Set(['strong', 'b', 'em', 'i', 'code', 's', 'strike', 'del', 'a']);

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map(processNode).join('');

      if (allowedTags.has(tagName)) {
        if (tagName === 'a') {
          const href = el.getAttribute('href');
          if (href) {
            return `<a href="${escapeHtml(href)}">${children}</a>`;
          }
        }
        return `<${tagName}>${children}</${tagName}>`;
      }

      // For non-allowed tags, just return children
      return children;
    }

    return '';
  }

  return Array.from(element.childNodes).map(processNode).join('');
}

// ============================================================================
// Editable Quote Hook (R-200d)
// ============================================================================

/**
 * Hook for contenteditable quote behavior with InlineContent and citation support
 */
function useEditableQuote({
  editable,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  onKeyDown,
  onEnter,
  onBackspaceAtStart,
  onSelectionChange,
}: EditableQuoteProps) {
  const elementRef = useRef<HTMLElement>(null);
  const lastHtmlRef = useRef<string>('');

  // Handle input events
  const handleInput = useCallback(() => {
    if (!elementRef.current || !onChange) return;

    const html = elementRef.current.innerHTML;
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html;
      const content = htmlToInlineContent(html);
      onChange(content);
    }
  }, [onChange]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    if (!onSelectionChange || !elementRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      onSelectionChange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!elementRef.current.contains(range.commonAncestorContainer)) {
      onSelectionChange(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const activeFormats = getActiveFormats();
    const linkUrl = getLinkAtSelection();

    onSelectionChange({
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      text: selection.toString(),
      activeFormats,
      hasLink: activeFormats.includes('link'),
      linkUrl,
    });
  }, [onSelectionChange]);

  // Set up selection change listener
  useEffect(() => {
    if (!editable || !onSelectionChange) return undefined;

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [editable, onSelectionChange, handleSelectionChange]);

  // Handle key down events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === 'Enter' && !event.shiftKey) {
        // Enter creates new paragraph within quote
        event.preventDefault();
        onEnter?.();
      } else if (event.key === 'Backspace') {
        const selection = window.getSelection();
        const element = elementRef.current;
        if (selection && element && selection.isCollapsed && selection.anchorOffset === 0) {
          const range = selection.getRangeAt(0);
          const preRange = document.createRange();
          preRange.selectNodeContents(element);
          preRange.setEnd(range.startContainer, range.startOffset);
          if (preRange.toString() === '') {
            onBackspaceAtStart?.();
          }
        }
      }
    },
    [onKeyDown, onEnter, onBackspaceAtStart],
  );

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur?.();
    onSelectionChange?.(null);
  }, [onBlur, onSelectionChange]);

  // Handle paste - preserve inline formatting
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    if (html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const cleanHtml = sanitizeInlineHtml(tempDiv);
      insertHtmlAtSelection(cleanHtml);
    } else {
      const text = event.clipboardData.getData('text/plain');
      insertTextAtSelection(text);
    }
  }, []);

  const editableProps = editable
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onPaste: handlePaste,
        'data-placeholder': placeholder,
        'aria-placeholder': placeholder,
      }
    : {};

  return { editableProps, elementRef };
}

/**
 * H1 - Primary page heading
 * Use once per page for the main title
 *
 * Supports editable mode (R-200a) with contenteditable for block editing.
 *
 * @example
 * ```tsx
 * // Static heading
 * <H1>Page Title</H1>
 *
 * // Editable heading
 * <H1
 *   editable
 *   onChange={(content) => setTitle(content)}
 *   placeholder="Enter title..."
 *   onEnter={() => createNextBlock()}
 * >
 *   {title}
 * </H1>
 * ```
 */
export const H1 = React.forwardRef<HTMLHeadingElement, EditableHeadingProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableHeading({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
    });

    const Component = as ?? 'h1';

    // Combine refs
    const combinedRef = (element: HTMLHeadingElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLHeadingElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.h1,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          // Placeholder styling should be applied via CSS using [data-placeholder]:empty:before
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
H1.displayName = 'H1';

/**
 * H2 - Section heading
 * Use for major sections within the page
 *
 * Supports editable mode (R-200a) with contenteditable for block editing.
 */
export const H2 = React.forwardRef<HTMLHeadingElement, EditableHeadingProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableHeading({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
    });

    const Component = as ?? 'h2';

    const combinedRef = (element: HTMLHeadingElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLHeadingElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.h2,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          // Placeholder styling should be applied via CSS using [data-placeholder]:empty:before
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
H2.displayName = 'H2';

/**
 * H3 - Subsection heading
 * Use for subsections within H2 sections
 *
 * Supports editable mode (R-200a) with contenteditable for block editing.
 */
export const H3 = React.forwardRef<HTMLHeadingElement, EditableHeadingProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableHeading({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
    });

    const Component = as ?? 'h3';

    const combinedRef = (element: HTMLHeadingElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLHeadingElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.h3,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          // Placeholder styling should be applied via CSS using [data-placeholder]:empty:before
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
H3.displayName = 'H3';

/**
 * H4 - Minor heading
 * Use for smaller subsections or grouped content
 *
 * Supports editable mode (R-200a) with contenteditable for block editing.
 */
export const H4 = React.forwardRef<HTMLHeadingElement, EditableHeadingProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableHeading({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
    });

    const Component = as ?? 'h4';

    const combinedRef = (element: HTMLHeadingElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLHeadingElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.h4,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          // Placeholder styling should be applied via CSS using [data-placeholder]:empty:before
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
H4.displayName = 'H4';

/**
 * P - Body paragraph
 * Standard paragraph text with proper line height
 *
 * Supports editable mode (R-200b) with contenteditable and InlineContent[] for rich text.
 *
 * @example
 * ```tsx
 * // Static paragraph
 * <P>Body text content.</P>
 *
 * // Editable paragraph with rich text support
 * <P
 *   editable
 *   onChange={(content) => setContent(content)}
 *   onSelectionChange={(selection) => {
 *     if (selection) {
 *       setToolbarVisible(true);
 *       setToolbarPosition({ x: selection.rect.x, y: selection.rect.y });
 *     } else {
 *       setToolbarVisible(false);
 *     }
 *   }}
 *   placeholder="Start typing..."
 * >
 *   {children}
 * </P>
 * ```
 */
export const P = React.forwardRef<HTMLParagraphElement, EditableParagraphProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      onSelectionChange,
      onSlashCommand,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableParagraph({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      onSelectionChange,
      onSlashCommand,
    });

    const Component = as ?? 'p';

    // Combine refs
    const combinedRef = (element: HTMLParagraphElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLParagraphElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.p,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
P.displayName = 'P';

/**
 * Lead - Introductory paragraph
 * Larger, muted text for page or section introductions
 */
export const Lead = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'p';
    return (
      <Component
        ref={ref as React.Ref<HTMLParagraphElement>}
        className={classy(typographyClasses.lead, className)}
        {...props}
      />
    );
  },
);
Lead.displayName = 'Lead';

/**
 * Large - Emphasized text
 * Larger, semibold text for emphasis
 */
export const Large = React.forwardRef<HTMLDivElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'div';
    return (
      <Component
        ref={ref as React.Ref<HTMLDivElement>}
        className={classy(typographyClasses.large, className)}
        {...props}
      />
    );
  },
);
Large.displayName = 'Large';

/**
 * Small - Smaller text
 * For fine print, captions, or supporting text
 */
export const Small = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'small';
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={classy(typographyClasses.small, className)}
        {...props}
      />
    );
  },
);
Small.displayName = 'Small';

/**
 * Muted - Secondary text
 * De-emphasized text for metadata or supplementary info
 */
export const Muted = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'p';
    return (
      <Component
        ref={ref as React.Ref<HTMLParagraphElement>}
        className={classy(typographyClasses.muted, className)}
        {...props}
      />
    );
  },
);
Muted.displayName = 'Muted';

/**
 * Code - Inline code
 * Monospace text for code snippets, commands, or technical terms
 */
export const Code = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'code';
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={classy(typographyClasses.code, className)}
        {...props}
      />
    );
  },
);
Code.displayName = 'Code';

/**
 * Blockquote - Block quotation
 * For quotations or callouts with left border emphasis
 *
 * Supports editable mode (R-200d) with contenteditable and optional citation editing.
 *
 * @example
 * ```tsx
 * // Static quote
 * <Blockquote>
 *   "Design is not just what it looks like."
 * </Blockquote>
 *
 * // Editable quote with citation
 * <Blockquote
 *   editable
 *   citation="Steve Jobs"
 *   onChange={(content) => setQuote(content)}
 *   onCitationChange={(citation) => setCitation(citation)}
 *   placeholder="Enter quote..."
 * >
 *   {children}
 * </Blockquote>
 * ```
 */
export const Blockquote = React.forwardRef<HTMLQuoteElement, EditableQuoteProps>(
  (
    {
      as,
      className,
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      onSelectionChange,
      citation,
      onCitationChange,
      children,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableQuote({
      editable,
      onChange,
      onFocus,
      onBlur,
      placeholder,
      onKeyDown,
      onEnter,
      onBackspaceAtStart,
      onSelectionChange,
    });

    const citationRef = useRef<HTMLElement>(null);

    const handleCitationInput = useCallback(() => {
      if (!citationRef.current || !onCitationChange) return;
      const text = citationRef.current.textContent ?? '';
      onCitationChange(text);
    }, [onCitationChange]);

    const Component = as ?? 'blockquote';

    // Combine refs
    const combinedRef = (element: HTMLQuoteElement | null) => {
      (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLQuoteElement | null>).current = element;
      }
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(
          typographyClasses.blockquote,
          editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
          className,
        )}
        data-editable={editable || undefined}
        {...editableProps}
        {...props}
      >
        {children}
        {(citation !== undefined || (editable && onCitationChange)) && (
          <cite
            ref={citationRef}
            className={classy(
              'mt-2 block text-sm text-muted-foreground not-italic',
              editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
            )}
            contentEditable={editable}
            suppressContentEditableWarning={editable}
            onInput={editable ? handleCitationInput : undefined}
            data-placeholder={editable ? 'Add citation...' : undefined}
          >
            {citation}
          </cite>
        )}
      </Component>
    );
  },
);
Blockquote.displayName = 'Blockquote';

// ============================================================================
// Editable List Hook (R-200c)
// ============================================================================

/**
 * Hook for contenteditable list behavior with item-level editing
 */
function useEditableList({
  items,
  editable,
  onChange,
  onItemAdd,
  onItemRemove,
  onIndent,
  onOutdent,
  placeholder,
}: EditableListProps) {
  const listRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // Handle item content change
  const handleItemInput = useCallback(
    (index: number) => {
      if (!onChange) return;

      const item = items[index];
      if (!item) return;

      const element = itemRefs.current.get(item.id);
      if (!element) return;

      const html = element.innerHTML;
      const content = htmlToInlineContent(html);
      const newItems = [...items];
      newItems[index] = { ...item, content };
      onChange(newItems);
    },
    [items, onChange],
  );

  // Handle key events for list navigation
  const handleItemKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const item = items[index];
      if (!item) return;

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onItemAdd?.(index + 1);
      } else if (event.key === 'Backspace') {
        const element = itemRefs.current.get(item.id);
        if (!element) return;

        const selection = window.getSelection();
        if (selection?.isCollapsed && selection.anchorOffset === 0) {
          // Check if at the very start
          const range = selection.getRangeAt(0);
          const preRange = document.createRange();
          preRange.selectNodeContents(element);
          preRange.setEnd(range.startContainer, range.startOffset);
          if (preRange.toString() === '') {
            event.preventDefault();
            // If item is empty, remove it
            if (element.textContent === '') {
              onItemRemove?.(index);
            } else if (item.indent && item.indent > 0) {
              // If indented, outdent first
              onOutdent?.(index);
            } else if (index > 0) {
              // Merge with previous item
              onItemRemove?.(index);
            }
          }
        }
      } else if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          onOutdent?.(index);
        } else {
          onIndent?.(index);
        }
      }
    },
    [items, onItemAdd, onItemRemove, onIndent, onOutdent],
  );

  // Handle paste - strip to plain text or inline formatting
  const handleItemPaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    if (html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const cleanHtml = sanitizeInlineHtml(tempDiv);
      insertHtmlAtSelection(cleanHtml);
    } else {
      const text = event.clipboardData.getData('text/plain');
      insertTextAtSelection(text);
    }
  }, []);

  // Register item ref
  const registerItemRef = useCallback((id: string, element: HTMLLIElement | null) => {
    if (element) {
      itemRefs.current.set(id, element);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Build props for each list item
  const getItemProps = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || !editable) return {};

      return {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: () => handleItemInput(index),
        onKeyDown: (e: React.KeyboardEvent) => handleItemKeyDown(e, index),
        onPaste: handleItemPaste,
        'data-placeholder': placeholder,
        ref: (el: HTMLLIElement | null) => registerItemRef(item.id, el),
      };
    },
    [
      items,
      editable,
      handleItemInput,
      handleItemKeyDown,
      handleItemPaste,
      placeholder,
      registerItemRef,
    ],
  );

  return { listRef, getItemProps };
}

/**
 * List - Ordered or unordered list with editable support
 *
 * Supports editable mode (R-200c) with item-level editing, indentation, and list operations.
 *
 * @example
 * ```tsx
 * // Static list
 * <List items={[{ id: '1', content: 'First item' }, { id: '2', content: 'Second item' }]} />
 *
 * // Editable list
 * <List
 *   items={items}
 *   editable
 *   onChange={(items) => setItems(items)}
 *   onItemAdd={(index) => addItem(index)}
 *   onItemRemove={(index) => removeItem(index)}
 *   onIndent={(index) => indentItem(index)}
 *   onOutdent={(index) => outdentItem(index)}
 * />
 * ```
 */
export const List = React.forwardRef<HTMLUListElement | HTMLOListElement, EditableListProps>(
  (
    {
      items,
      ordered = false,
      editable,
      onChange,
      onItemAdd,
      onItemRemove,
      onIndent,
      onOutdent,
      placeholder,
      className,
      ...props
    },
    ref,
  ) => {
    const { listRef, getItemProps } = useEditableList({
      items,
      ordered,
      editable,
      onChange,
      onItemAdd,
      onItemRemove,
      onIndent,
      onOutdent,
      placeholder,
    });

    const Component = ordered ? 'ol' : 'ul';
    const listClass = ordered ? typographyClasses.ol : typographyClasses.ul;

    // Combine refs
    const combinedRef = (element: HTMLUListElement | HTMLOListElement | null) => {
      (listRef as React.MutableRefObject<HTMLElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element as HTMLUListElement & HTMLOListElement);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLUListElement | HTMLOListElement | null>).current =
          element;
      }
    };

    // Indent classes using Tailwind spacing scale (semantic, not arbitrary)
    const getIndentClass = (indent: number | undefined): string => {
      if (!indent || indent <= 0) return '';
      // Use standard Tailwind spacing: ml-6, ml-12, ml-18 (not available), ml-24
      // Limit to 4 levels of nesting
      const indentMap: Record<number, string> = {
        1: 'ml-6',
        2: 'ml-12',
        3: 'ml-16',
        4: 'ml-24',
      };
      return indentMap[Math.min(indent, 4)] ?? 'ml-24';
    };

    return (
      <Component
        ref={combinedRef}
        className={classy(listClass, className)}
        data-editable={editable || undefined}
        {...props}
      >
        {items.map((item, index) => {
          const itemProps = getItemProps(index);
          const indentClass = getIndentClass(item.indent);

          if (editable) {
            // Content is sanitized via escapeHtml in inlineContentToHtml
            const htmlContent =
              typeof item.content === 'string'
                ? escapeHtml(item.content)
                : inlineContentToHtml(item.content);

            return (
              <li
                key={item.id}
                className={classy(
                  typographyClasses.li,
                  indentClass,
                  'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded',
                )}
                {...itemProps}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            );
          }

          // For static mode with InlineContent[], use dangerouslySetInnerHTML
          // Content is sanitized via escapeHtml in inlineContentToHtml
          if (typeof item.content !== 'string') {
            return (
              <li
                key={item.id}
                className={classy(typographyClasses.li, indentClass)}
                dangerouslySetInnerHTML={{ __html: inlineContentToHtml(item.content) }}
              />
            );
          }

          return (
            <li key={item.id} className={classy(typographyClasses.li, indentClass)}>
              {item.content}
            </li>
          );
        })}
      </Component>
    );
  },
);
List.displayName = 'List';

// ============================================================================
// Editable CodeBlock Hook (R-200e)
// ============================================================================

/**
 * Hook for contenteditable code block behavior
 */
function useEditableCodeBlock({
  editable,
  onChange,
  tabSize = 2,
  placeholder,
}: Pick<EditableCodeBlockProps, 'editable' | 'onChange' | 'tabSize' | 'placeholder'>) {
  const elementRef = useRef<HTMLPreElement>(null);
  const lastContentRef = useRef<string>('');

  // Handle input events
  const handleInput = useCallback(() => {
    if (!elementRef.current || !onChange) return;

    const content = elementRef.current.textContent ?? '';
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      onChange(content);
    }
  }, [onChange]);

  // Handle key events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const spaces = ' '.repeat(tabSize);
        insertTextAtSelection(spaces);
      } else if (event.key === 'Enter') {
        // Allow Enter for new lines in code blocks
        event.preventDefault();
        insertTextAtSelection('\n');
      }
    },
    [tabSize],
  );

  // Handle paste - always plain text for code
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    insertTextAtSelection(text);
  }, []);

  const editableProps = editable
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onInput: handleInput,
        onKeyDown: handleKeyDown,
        onPaste: handlePaste,
        'data-placeholder': placeholder,
        'aria-placeholder': placeholder,
        spellCheck: false,
      }
    : {};

  return { editableProps, elementRef };
}

/**
 * CodeBlock - Multi-line code block with optional syntax highlighting
 *
 * Supports editable mode (R-200e) with proper Tab handling and plain text paste.
 *
 * @example
 * ```tsx
 * // Static code block
 * <CodeBlock language="typescript">
 *   const greeting = "Hello, World!";
 * </CodeBlock>
 *
 * // Editable code block
 * <CodeBlock
 *   editable
 *   language={language}
 *   onChange={(code) => setCode(code)}
 *   onLanguageChange={(lang) => setLanguage(lang)}
 *   showLineNumbers
 * >
 *   {code}
 * </CodeBlock>
 * ```
 */
export const CodeBlock = React.forwardRef<HTMLPreElement, EditableCodeBlockProps>(
  (
    {
      children,
      language,
      editable,
      onChange,
      onLanguageChange,
      showLineNumbers = false,
      tabSize = 2,
      placeholder,
      className,
      ...props
    },
    ref,
  ) => {
    const { editableProps, elementRef } = useEditableCodeBlock({
      editable,
      onChange,
      tabSize,
      placeholder,
    });

    // Combine refs
    const combinedRef = (element: HTMLPreElement | null) => {
      (elementRef as React.MutableRefObject<HTMLPreElement | null>).current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLPreElement | null>).current = element;
      }
    };

    const lines = children.split('\n');

    return (
      <div className="group" data-editable={editable || undefined}>
        {/* Language selector for editable mode */}
        {editable && onLanguageChange && (
          <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t-lg border-b border-border">
            <select
              value={language ?? ''}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-xs text-muted-foreground border-none outline-none cursor-pointer"
            >
              <option value="">Plain text</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="bash">Bash</option>
              <option value="sql">SQL</option>
            </select>
            {language && <span className="text-xs text-muted-foreground">{language}</span>}
          </div>
        )}

        <pre
          ref={combinedRef}
          className={classy(
            typographyClasses.codeblock,
            editable && 'outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            editable && onLanguageChange && 'rounded-t-none',
            className,
          )}
          data-language={language}
          {...editableProps}
          {...props}
        >
          {showLineNumbers && !editable ? (
            <code className="flex">
              <span className="select-none pr-4 text-muted-foreground border-r border-border mr-4">
                {lines.map((_, i) => (
                  <span key={`line-${i + 1}`} className="block">
                    {i + 1}
                  </span>
                ))}
              </span>
              <span className="flex-1">{children}</span>
            </code>
          ) : (
            <code>{children}</code>
          )}
        </pre>
      </div>
    );
  },
);
CodeBlock.displayName = 'CodeBlock';

// ============================================================================
// Additional Typography Components
// ============================================================================

/**
 * Mark - Highlighted text
 * Use for search results, emphasized terms, or important callouts
 *
 * @example
 * ```tsx
 * <P>The <Mark>important</Mark> part of this sentence.</P>
 * ```
 */
export const Mark = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as, className, ...props }, ref) => {
    const Component = as ?? 'mark';
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={classy(typographyClasses.mark, className)}
        {...props}
      />
    );
  },
);
Mark.displayName = 'Mark';

/**
 * Abbr - Abbreviation with tooltip
 * Use for acronyms or technical terms that need explanation
 *
 * @example
 * ```tsx
 * <P>The <Abbr title="Application Programming Interface">API</Abbr> is well documented.</P>
 * ```
 */
export const Abbr = React.forwardRef<HTMLElement, TypographyProps & { title: string }>(
  ({ as, className, title, ...props }, ref) => {
    const Component = as ?? 'abbr';
    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        className={classy(typographyClasses.abbr, className)}
        title={title}
        {...props}
      />
    );
  },
);
Abbr.displayName = 'Abbr';

// Export typography classes for direct use
export { typographyClasses };

// Export helper functions for InlineContent conversion (R-200b)
export { inlineContentToHtml, htmlToInlineContent };
