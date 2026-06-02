import { describe, expect, it } from 'vitest';
import { createDocumentEditor, domBlockContent } from './document-editor';
import type { BaseBlock } from './types';

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

describe('inline format shortcuts (apply-side)', () => {
  it('Cmd+B on a selection writes the bold mark into block content', () => {
    const container = document.createElement('div');
    const p = document.createElement('p');
    p.setAttribute('data-block-id', 'b1');
    p.textContent = 'The quick brown fox';
    container.appendChild(p);
    document.body.appendChild(container);

    let latest: BaseBlock[] = [];
    const editor = createDocumentEditor({
      container,
      initialBlocks: [{ id: 'b1', type: 'text', content: 'The quick brown fox' }],
      onBlocksChange: (blocks) => {
        latest = blocks;
      },
    });

    // Select the word "brown".
    const textNode = p.firstChild as Text;
    const idx = textNode.data.indexOf('brown');
    const range = document.createRange();
    range.setStart(textNode, idx);
    range.setEnd(textNode, idx + 'brown'.length);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true, cancelable: true }),
    );

    expect(latest[0]?.content).toEqual([
      { text: 'The quick ' },
      { text: 'brown', marks: ['bold'] },
      { text: ' fox' },
    ]);

    editor.destroy();
  });
});
