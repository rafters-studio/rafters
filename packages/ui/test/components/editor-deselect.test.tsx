import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Editor, type EditorControls } from '../../src/components/ui/editor';

/**
 * Editor parity gap #3 (docs/EDITOR_PARITY_GOAL.md; editor-known-gaps.mdx
 * "Editor.deselect Is A Stub"). deselect() was an empty function; consumers
 * that programmatically drop selection (after save/navigation) had no working
 * way to do it. It must clear the selection and blur the active contenteditable.
 */
afterEach(cleanup);

describe('Editor.deselect', () => {
  it('clears the selection and blurs the canvas', () => {
    const ref = createRef<EditorControls>();
    const { container } = render(
      <Editor ref={ref} defaultValue={[{ id: '1', type: 'text', content: 'hello' }]} />,
    );

    const canvas = container.querySelector('[contenteditable="true"]') as HTMLElement | null;
    expect(canvas).not.toBeNull();

    // Focus the canvas and place a selection inside it.
    canvas?.focus();
    const textNode = container.querySelector('[data-block-id]')?.firstChild as Text | null;
    if (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    expect(window.getSelection()?.rangeCount ?? 0).toBeGreaterThan(0);

    ref.current?.deselect();

    expect(window.getSelection()?.rangeCount ?? 0).toBe(0);
    expect(document.activeElement).not.toBe(canvas);
  });
});
