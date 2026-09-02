/**
 * #2212: React-only `initialDocument`/`onChange` props on `Editor`. These
 * sit alongside editor.conformance.test.tsx (which still owns the
 * label/aria/disabled/readonly integration suite for the React performance)
 * rather than inside it, since this file exercises props this issue's
 * pinned interface added, not the shared cross-performance contract.
 */
import { cleanup, render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '../../../src/components/editor/editor';
import type { BaseBlock } from '../../../src/primitives/types';
import { partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

const root = () => partElement(document.body, 'root') as HTMLElement;

function seededDoc(): BaseBlock[] {
  return [{ id: 'b1', type: 'text', content: 'hello' }];
}

/** Same beforeinput-dispatch technique editor.element.conformance.test.ts
 *  and editor.astro.conformance.test.ts use to drive a real edit: the
 *  handler reads the caret from the history cell's own `sel`, not a live
 *  DOM Selection/Range, so no focus/selection setup is needed first. */
function typeChar(char: string): void {
  act(() => {
    root().dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

function undo(): void {
  act(() => {
    root().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
    );
  });
}

describe('editor react props [initialDocument]', () => {
  it('seeds the rendered document on mount', () => {
    render(<Editor label="Document" initialDocument={seededDoc()} />);
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');
  });

  it('an omitted initialDocument keeps the existing empty-editor behavior', () => {
    render(<Editor label="Document" />);
    expect(root().querySelectorAll('[data-block-id]').length).toBe(0);
  });

  it('an explicit empty initialDocument produces the same empty-editor behavior as omitting it (pinned Error Handling)', () => {
    render(<Editor label="Document" initialDocument={[]} />);
    expect(root().querySelectorAll('[data-block-id]').length).toBe(0);
  });

  it('seeds the default caret at the first block, so a same-tick edit lands correctly', () => {
    const onChange = vi.fn();
    render(<Editor label="Document" initialDocument={seededDoc()} onChange={onChange} />);

    typeChar('!'); // offset 0 of b1 if the default selection is collapsed there

    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('!hello');
  });

  it('is read once -- a changed initialDocument after mount is ignored (remount via key to reload)', () => {
    const { rerender } = render(<Editor label="Document" initialDocument={seededDoc()} />);
    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');

    rerender(
      <Editor
        label="Document"
        initialDocument={[{ id: 'b2', type: 'text', content: 'goodbye' }]}
      />,
    );

    expect(root().querySelector('[data-block-id="b1"]')?.textContent).toBe('hello');
    expect(root().querySelector('[data-block-id="b2"]')).toBeNull();
  });
});

describe('editor react props [onChange]', () => {
  it('does not fire on mount', () => {
    const onChange = vi.fn();
    render(<Editor label="Document" initialDocument={seededDoc()} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('fires with the new document after an op apply', () => {
    const onChange = vi.fn();
    render(<Editor label="Document" initialDocument={seededDoc()} onChange={onChange} />);

    typeChar('!'); // default seeded selection is collapsed at offset 0 of b1

    expect(onChange).toHaveBeenCalledTimes(1);
    const doc = onChange.mock.calls[0]?.[0] as BaseBlock[];
    expect(doc[0]?.content).toEqual('!hello');
  });

  it('fires again on undo, with the restored document', () => {
    const onChange = vi.fn();
    render(<Editor label="Document" initialDocument={seededDoc()} onChange={onChange} />);

    typeChar('!');
    undo();

    expect(onChange).toHaveBeenCalledTimes(2);
    const doc = onChange.mock.calls[1]?.[0] as BaseBlock[];
    expect(doc[0]?.content).toEqual('hello');
  });

  it('reads the latest callback via the ref at fire time -- an identity change across rerenders is picked up without remounting', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Editor label="Document" initialDocument={seededDoc()} onChange={first} />,
    );

    rerender(<Editor label="Document" initialDocument={seededDoc()} onChange={second} />);
    typeChar('!');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
