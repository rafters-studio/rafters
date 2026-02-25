import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EditorBlock, EditorControls } from '../../src/components/ui/editor';
import { Editor } from '../../src/components/ui/editor';

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

  it('renders with role="listbox" on the canvas when blocks present', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('does not render role="listbox" when empty (ARIA requires option children)', () => {
    render(<Editor />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders aria-multiselectable on the canvas', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('renders aria-label on the canvas', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Editor blocks');
  });

  describe('Default values', () => {
    it('renders blocks from defaultValue', () => {
      render(<Editor defaultValue={BLOCKS} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('renders default block content as text', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.getByText('First block')).toBeInTheDocument();
      expect(screen.getByText('Second block')).toBeInTheDocument();
      expect(screen.getByText('Third block')).toBeInTheDocument();
    });

    it('renders aria-selected=false on unselected blocks', () => {
      render(<Editor defaultValue={BLOCKS} />);
      const options = screen.getAllByRole('option');
      for (const option of options) {
        expect(option).toHaveAttribute('aria-selected', 'false');
      }
    });

    it('renders data-block-id on each block wrapper', () => {
      render(<Editor defaultValue={BLOCKS} />);
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('data-block-id', '1');
      expect(options[1]).toHaveAttribute('data-block-id', '2');
      expect(options[2]).toHaveAttribute('data-block-id', '3');
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
      render(<Editor value={BLOCKS} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
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
      render(<ControlledEditor />);
      expect(screen.getAllByRole('option')).toHaveLength(3);
      fireEvent.click(screen.getByText('Trim'));
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });
  });

  describe('Custom renderBlock', () => {
    it('calls renderBlock with correct context', () => {
      const renderBlock = vi.fn((block: EditorBlock, ctx) => (
        <div data-testid={`custom-${block.id}`}>{`${ctx.index}/${ctx.total}`}</div>
      ));
      render(<Editor defaultValue={BLOCKS} renderBlock={renderBlock} />);

      expect(renderBlock).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId('custom-1')).toHaveTextContent('0/3');
      expect(screen.getByTestId('custom-2')).toHaveTextContent('1/3');
      expect(screen.getByTestId('custom-3')).toHaveTextContent('2/3');
    });

    it('provides isFirst and isLast in context', () => {
      const contexts: Array<{ isFirst: boolean; isLast: boolean }> = [];
      const renderBlock = vi.fn((block: EditorBlock, ctx) => {
        contexts.push({ isFirst: ctx.isFirst, isLast: ctx.isLast });
        return <div>{block.id}</div>;
      });
      render(<Editor defaultValue={BLOCKS} renderBlock={renderBlock} />);

      expect(contexts[0]).toEqual({ isFirst: true, isLast: false });
      expect(contexts[1]).toEqual({ isFirst: false, isLast: false });
      expect(contexts[2]).toEqual({ isFirst: false, isLast: true });
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

    it('undo and redo buttons are disabled initially', () => {
      render(<Editor defaultValue={BLOCKS} toolbar />);
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    });
  });

  describe('Sidebar', () => {
    it('does not render sidebar by default', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('renders sidebar when sidebar prop is true', () => {
      render(<Editor defaultValue={BLOCKS} sidebar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('sidebar has aria-label', () => {
      render(<Editor defaultValue={BLOCKS} sidebar />);
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Block navigation');
    });

    it('sidebar lists all blocks', () => {
      render(<Editor defaultValue={BLOCKS} sidebar />);
      const nav = screen.getByRole('navigation');
      const buttons = nav.querySelectorAll('button');
      expect(buttons).toHaveLength(3);
    });
  });

  describe('Disabled state', () => {
    it('sets aria-disabled on root', () => {
      const { container } = render(<Editor disabled />);
      expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
    });

    it('sets tabIndex=-1 on canvas when disabled', () => {
      render(<Editor defaultValue={BLOCKS} disabled />);
      expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '-1');
    });

    it('sets tabIndex=0 on canvas when enabled', () => {
      render(<Editor defaultValue={BLOCKS} />);
      expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '0');
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
      expect(document.activeElement).toBe(screen.getByRole('listbox'));
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
