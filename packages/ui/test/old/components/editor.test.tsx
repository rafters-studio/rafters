import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EditorBlock, EditorControls } from '../../../src/old/ui/editor';
import { Editor } from '../../../src/old/ui/editor';

const BLOCKS: EditorBlock[] = [
  { id: '1', type: 'text', content: 'First block' },
  { id: '2', type: 'text', content: 'Second block' },
  { id: '3', type: 'text', content: 'Third block' },
];

describe('Editor', () => {
  it('renders without crash', () => {
    const { container } = render(<Editor />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders aria-label on the document surface', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByLabelText('Document editor')).toBeInTheDocument();
  });

  describe('Default values', () => {
    it('renders blocks from defaultValue', () => {
      const { container } = render(<Editor defaultValue={BLOCKS} />);
      const blockEls = container.querySelectorAll('[data-block-id]');
      expect(blockEls).toHaveLength(3);
    });

    it('renders default block content as text', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.getByText('First block')).toBeInTheDocument();
      expect(screen.getByText('Second block')).toBeInTheDocument();
      expect(screen.getByText('Third block')).toBeInTheDocument();
    });

    it('renders data-block-id on each block element', () => {
      const { container } = render(<Editor defaultValue={BLOCKS} />);
      const blockEls = container.querySelectorAll('[data-block-id]');
      expect(blockEls[0]).toHaveAttribute('data-block-id', '1');
      expect(blockEls[1]).toHaveAttribute('data-block-id', '2');
      expect(blockEls[2]).toHaveAttribute('data-block-id', '3');
    });

    it('renders text blocks as <p> elements', () => {
      const { container } = render(<Editor defaultValue={BLOCKS} />);
      const paragraphs = container.querySelectorAll('p[data-block-id]');
      expect(paragraphs).toHaveLength(3);
    });

    it('renders heading blocks as <h1>-<h6> elements', () => {
      const headingBlocks: EditorBlock[] = [
        { id: 'h1', type: 'heading', content: 'Title', meta: { level: 1 } },
        { id: 'h2', type: 'heading', content: 'Subtitle', meta: { level: 2 } },
      ];
      const { container } = render(<Editor defaultValue={headingBlocks} />);
      expect(container.querySelector('h1[data-block-id="h1"]')).toBeInTheDocument();
      expect(container.querySelector('h2[data-block-id="h2"]')).toBeInTheDocument();
    });

    it('renders code blocks as <pre> elements', () => {
      const codeBlocks: EditorBlock[] = [
        { id: 'c1', type: 'code', content: 'const x = 1;', meta: { language: 'ts' } },
      ];
      const { container } = render(<Editor defaultValue={codeBlocks} />);
      expect(container.querySelector('pre[data-block-id="c1"]')).toBeInTheDocument();
    });

    it('renders quote blocks as <blockquote> elements', () => {
      const quoteBlocks: EditorBlock[] = [{ id: 'q1', type: 'quote', content: 'Wise words' }];
      const { container } = render(<Editor defaultValue={quoteBlocks} />);
      expect(container.querySelector('blockquote[data-block-id="q1"]')).toBeInTheDocument();
    });

    it('renders divider blocks as <hr> elements', () => {
      const dividerBlocks: EditorBlock[] = [{ id: 'd1', type: 'divider' }];
      const { container } = render(<Editor defaultValue={dividerBlocks} />);
      expect(container.querySelector('hr[data-block-id="d1"]')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders default empty state when no blocks', () => {
      render(<Editor />);
      expect(screen.getByText(/No blocks yet/)).toBeInTheDocument();
    });

    it('renders custom empty state', () => {
      render(<Editor emptyState={<div>Custom empty</div>} />);
      expect(screen.getByText('Custom empty')).toBeInTheDocument();
    });

    it('does not render empty state when blocks exist', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.queryByText(/No blocks yet/)).not.toBeInTheDocument();
    });
  });

  describe('Controlled mode', () => {
    it('renders controlled value', () => {
      const { container } = render(<Editor value={BLOCKS} />);
      const blockEls = container.querySelectorAll('[data-block-id]');
      expect(blockEls).toHaveLength(3);
    });

    it('updates when controlled value changes', () => {
      function ControlledEditor() {
        const [blocks, setBlocks] = useState<EditorBlock[]>(BLOCKS);
        return (
          <div>
            <Editor value={blocks} onValueChange={setBlocks} />
            <button type="button" onClick={() => setBlocks(BLOCKS.slice(0, 2))}>
              Trim
            </button>
          </div>
        );
      }
      const { container } = render(<ControlledEditor />);
      expect(container.querySelectorAll('[data-block-id]')).toHaveLength(3);
      fireEvent.click(screen.getByText('Trim'));
      expect(container.querySelectorAll('[data-block-id]')).toHaveLength(2);
    });
  });

  describe('Toolbar', () => {
    it('does not render toolbar by default', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('renders toolbar when toolbar prop is true', () => {
      render(<Editor defaultValue={BLOCKS} toolbar />);
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('toolbar has aria-label', () => {
      render(<Editor defaultValue={BLOCKS} toolbar />);
      expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Editor toolbar');
    });

    it('renders undo and redo buttons', () => {
      render(<Editor defaultValue={BLOCKS} toolbar />);
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    });

    it('redo is disabled when there is no forward history', () => {
      render(<Editor defaultValue={BLOCKS} toolbar />);
      expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    });
  });

  describe('Disabled state', () => {
    it('sets aria-disabled on root', () => {
      const { container } = render(<Editor disabled />);
      expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
    });

    it('sets tabIndex=-1 on canvas when disabled', () => {
      render(<Editor defaultValue={BLOCKS} disabled />);
      expect(screen.getByLabelText('Document editor')).toHaveAttribute('tabindex', '-1');
    });

    it('sets tabIndex=0 on canvas when enabled', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.getByLabelText('Document editor')).toHaveAttribute('tabindex', '0');
    });

    it('applies opacity class when disabled', () => {
      const { container } = render(<Editor disabled />);
      expect(container.firstChild).toHaveClass('opacity-50');
    });
  });

  describe('Imperative handle', () => {
    it('exposes addBlock via ref', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={[]} onValueChange={onChange} ref={ref} />);

      expect(ref.current).not.toBeNull();
      ref.current?.addBlock({ id: 'new', type: 'text', content: 'New' });
      expect(onChange).toHaveBeenCalledWith([{ id: 'new', type: 'text', content: 'New' }]);
    });

    it('exposes addBlocks via ref for batch insert', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={[]} onValueChange={onChange} ref={ref} />);

      ref.current?.addBlocks([
        { id: 'a', type: 'heading', content: 'Title' },
        { id: 'b', type: 'input', content: '' },
        { id: 'c', type: 'button', content: 'Submit' },
      ]);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'a', type: 'heading' }),
        expect.objectContaining({ id: 'b', type: 'input' }),
        expect.objectContaining({ id: 'c', type: 'button' }),
      ]);
    });

    it('addBlocks inserts at specified index', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueChange={onChange} ref={ref} />);

      ref.current?.addBlocks(
        [
          { id: 'x', type: 'divider', content: '' },
          { id: 'y', type: 'divider', content: '' },
        ],
        1,
      );
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: 'x' }),
        expect.objectContaining({ id: 'y' }),
        expect.objectContaining({ id: '2' }),
        expect.objectContaining({ id: '3' }),
      ]);
    });

    it('addBlocks is a no-op for empty array', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueChange={onChange} ref={ref} />);

      ref.current?.addBlocks([]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('exposes removeBlocks via ref', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueChange={onChange} ref={ref} />);

      ref.current?.removeBlocks(new Set(['2']));
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '3' }),
        ]),
      );
    });

    it('exposes moveBlock via ref', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueChange={onChange} ref={ref} />);

      ref.current?.moveBlock('3', 0);
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: '3' }),
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '2' }),
      ]);
    });

    it('exposes updateBlock via ref', () => {
      const ref = { current: null as EditorControls | null };
      const onChange = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueChange={onChange} ref={ref} />);

      ref.current?.updateBlock('1', { content: 'Updated' });
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: '1', content: 'Updated' })]),
      );
    });

    it('exposes focus via ref', () => {
      const ref = { current: null as EditorControls | null };
      render(<Editor defaultValue={BLOCKS} ref={ref} />);

      ref.current?.focus();
      expect(document.activeElement).toBe(screen.getByLabelText('Document editor'));
    });
  });

  describe('onValueCommit', () => {
    it('fires on addBlock', () => {
      const ref = { current: null as EditorControls | null };
      const onCommit = vi.fn();
      render(<Editor defaultValue={[]} onValueCommit={onCommit} ref={ref} />);

      ref.current?.addBlock({ id: 'a', type: 'text', content: '' });
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('fires on removeBlocks', () => {
      const ref = { current: null as EditorControls | null };
      const onCommit = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueCommit={onCommit} ref={ref} />);

      ref.current?.removeBlocks(new Set(['1']));
      expect(onCommit).toHaveBeenCalledTimes(1);
    });

    it('does not fire on updateBlock', () => {
      const ref = { current: null as EditorControls | null };
      const onCommit = vi.fn();
      render(<Editor defaultValue={BLOCKS} onValueCommit={onCommit} ref={ref} />);

      ref.current?.updateBlock('1', { content: 'Updated' });
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe('Additional props', () => {
    it('applies custom className', () => {
      const { container } = render(<Editor className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('passes dir prop', () => {
      const { container } = render(<Editor dir="rtl" />);
      expect(container.firstChild).toHaveAttribute('dir', 'rtl');
    });

    it('passes through additional HTML attributes', () => {
      const { container } = render(<Editor data-testid="editor" id="my-editor" />);
      expect(container.firstChild).toHaveAttribute('id', 'my-editor');
    });
  });
});
