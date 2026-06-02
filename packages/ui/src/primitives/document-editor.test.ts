import { describe, expect, it } from 'vitest';
import { domBlockContent } from './document-editor';

/**
 * Editor parity, gap #1 (docs/EDITOR_PARITY_GOAL.md). reconcileDOM previously
 * read el.textContent, flattening user-applied inline marks before they could be
 * saved. domBlockContent is the policy it now uses: plain text stays a string
 * (the simple block.content shape), formatted text becomes mark-preserving
 * InlineContent[].
 */

function blockEl(html: string): HTMLElement {
  const el = document.createElement('p');
  el.setAttribute('data-block-id', 'b1');
  el.innerHTML = html;
  return el;
}

describe('domBlockContent', () => {
  it('returns a plain string for unformatted text', () => {
    expect(domBlockContent(blockEl('Hello world'))).toBe('Hello world');
  });

  it('returns mark-preserving InlineContent[] for formatted text', () => {
    expect(domBlockContent(blockEl('Hello <strong>world</strong>'))).toEqual([
      { text: 'Hello ' },
      { text: 'world', marks: ['bold'] },
    ]);
  });

  it('returns an empty string for an empty element', () => {
    expect(domBlockContent(blockEl(''))).toBe('');
  });

  it('joins fragmented (multi-text-node) unformatted text into one string', () => {
    // contenteditable editing leaves blocks split into several adjacent text
    // nodes; an unmarked block must still reconcile to a plain string.
    const el = document.createElement('p');
    el.setAttribute('data-block-id', 'b1');
    el.appendChild(document.createTextNode('Hello'));
    el.appendChild(document.createTextNode(' world'));
    expect(domBlockContent(el)).toBe('Hello world');
  });
});
