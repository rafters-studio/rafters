import { describe, expect, it } from 'vitest';
import { serializeElement } from './inline-formatter';

/**
 * Editor parity, gap #1 (inline-formatter write path; docs/EDITOR_PARITY_GOAL.md).
 *
 * serializeElement turns a block element's DOM (with inline mark tags) into the
 * mark-preserving InlineContent[] shape. It is the missing read-path piece:
 * document-editor.reconcileDOM flattens to el.textContent today, dropping marks.
 */

function block(html: string): HTMLElement {
  const el = document.createElement('p');
  el.setAttribute('data-block-id', 'b1');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('serializeElement', () => {
  it('serializes a <strong> child to a bold InlineContent segment', () => {
    expect(serializeElement(block('Hello <strong>world</strong>'))).toEqual([
      { text: 'Hello ' },
      { text: 'world', marks: ['bold'] },
    ]);
  });

  it('serializes plain text to a single unmarked segment', () => {
    expect(serializeElement(block('Just text'))).toEqual([{ text: 'Just text' }]);
  });

  it('captures em (italic), code, and link href', () => {
    expect(
      serializeElement(block('a <em>b</em> <code>c</code> <a href="https://x.com">d</a>')),
    ).toEqual([
      { text: 'a ' },
      { text: 'b', marks: ['italic'] },
      { text: ' ' },
      { text: 'c', marks: ['code'] },
      { text: ' ' },
      { text: 'd', marks: ['link'], href: 'https://x.com' },
    ]);
  });

  it('returns an empty array for an empty element', () => {
    expect(serializeElement(block(''))).toEqual([]);
  });
});
