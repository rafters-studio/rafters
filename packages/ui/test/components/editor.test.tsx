import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type {
  EditorBlock,
  EditorControls,
  EditorRulePaletteConfig,
  EditorSidebarConfig,
} from '../../src/components/ui/editor';
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

describe('Editor sidebar', () => {
  const SIDEBAR: EditorSidebarConfig = {
    items: [
      { id: 'heading', label: 'Heading', category: 'Text', keywords: ['h1'] },
      { id: 'paragraph', label: 'Paragraph', category: 'Text' },
      { id: 'image', label: 'Image', category: 'Media' },
    ],
    categories: ['Text', 'Media'],
    searchable: true,
  };

  it('does not render a sidebar when the prop is omitted', () => {
    render(<Editor />);
    expect(screen.queryByRole('complementary', { name: 'Block palette' })).not.toBeInTheDocument();
  });

  it('renders the block-palette sidebar when the sidebar prop is passed', () => {
    render(<Editor sidebar={SIDEBAR} />);
    expect(screen.getByRole('complementary', { name: 'Block palette' })).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders every configured item', () => {
    render(<Editor sidebar={SIDEBAR} />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('renders category headers in configured order', () => {
    render(<Editor sidebar={SIDEBAR} />);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('renders a search input when searchable is true', () => {
    render(<Editor sidebar={SIDEBAR} />);
    expect(screen.getByRole('searchbox', { name: 'Search blocks' })).toBeInTheDocument();
  });

  it('omits the search input when searchable is false', () => {
    render(<Editor sidebar={{ ...SIDEBAR, searchable: false }} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('filters items as the search query changes', () => {
    render(<Editor sidebar={SIDEBAR} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search blocks' }), {
      target: { value: 'imag' },
    });
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.queryByText('Heading')).not.toBeInTheDocument();
    expect(screen.queryByText('Paragraph')).not.toBeInTheDocument();
  });

  it('calls onItemInsert with the editor controls when an item is clicked', () => {
    const onItemInsert = vi.fn();
    render(<Editor sidebar={{ ...SIDEBAR, onItemInsert }} />);
    fireEvent.click(screen.getByText('Heading'));
    expect(onItemInsert).toHaveBeenCalledTimes(1);
    expect(onItemInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'heading' }),
      expect.objectContaining({ addBlocks: expect.any(Function) }),
      undefined,
    );
  });

  it('uses a custom renderItem when provided', () => {
    const renderItem = (item: { label: string }) => <span>Custom:{item.label}</span>;
    render(<Editor sidebar={{ ...SIDEBAR, renderItem }} />);
    expect(screen.getByText('Custom:Heading')).toBeInTheDocument();
  });
});

describe('Editor rule palette', () => {
  const RULE_PALETTE: EditorRulePaletteConfig = {
    items: [
      { id: 'required', label: 'Required', category: 'Validation' },
      { id: 'email', label: 'Email', category: 'Validation', compatibleBlockTypes: ['input'] },
      { id: 'min-length', label: 'Min Length', category: 'Constraints' },
    ],
    categories: ['Validation', 'Constraints'],
    searchable: true,
  };

  // Drive the editor's selectionchange-based focus tracking. happy-dom does not
  // reflect a programmatic Range back through window.getSelection(), so stub the
  // selection to point at the target block and fire selectionchange; trackFocus
  // reads anchorNode and resolves the block id from it.
  function focusBlock(container: HTMLElement, blockId: string): void {
    const el = container.querySelector(`[data-block-id="${blockId}"]`);
    if (!el) throw new Error(`block ${blockId} not found`);
    const stub = vi.spyOn(window, 'getSelection').mockReturnValue({
      anchorNode: el,
      rangeCount: 1,
      getRangeAt: () => document.createRange(),
      removeAllRanges: () => {},
      toString: () => '',
    } as unknown as Selection);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    stub.mockRestore();
  }

  it('does not render a rule palette when the prop is omitted', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.queryByRole('complementary', { name: 'Rule palette' })).not.toBeInTheDocument();
  });

  it('renders the rule palette when the prop is passed', () => {
    render(<Editor defaultValue={BLOCKS} rulePalette={RULE_PALETTE} />);
    expect(screen.getByRole('complementary', { name: 'Rule palette' })).toBeInTheDocument();
  });

  it('renders every configured rule and category', () => {
    render(<Editor defaultValue={BLOCKS} rulePalette={RULE_PALETTE} />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Min Length')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Constraints')).toBeInTheDocument();
  });

  it('filters rules as the search query changes', () => {
    render(<Editor defaultValue={BLOCKS} rulePalette={RULE_PALETTE} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search rules' }), {
      target: { value: 'requir' },
    });
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
  });

  it('applies a rule to the focused block on activation', () => {
    const onRuleApplied = vi.fn();
    const { container } = render(
      <Editor defaultValue={BLOCKS} rulePalette={{ ...RULE_PALETTE, onRuleApplied }} />,
    );
    focusBlock(container, '1');
    fireEvent.click(screen.getByText('Required'));
    expect(onRuleApplied).toHaveBeenCalledWith(
      '1',
      'required',
      expect.objectContaining({ updateBlock: expect.any(Function) }),
    );
  });

  it('does not apply a rule when no block is focused', () => {
    const onRuleApplied = vi.fn();
    render(<Editor defaultValue={BLOCKS} rulePalette={{ ...RULE_PALETTE, onRuleApplied }} />);
    fireEvent.click(screen.getByText('Required'));
    expect(onRuleApplied).not.toHaveBeenCalled();
  });

  it('gates application on compatibleBlockTypes', () => {
    const onRuleApplied = vi.fn();
    const { container } = render(
      <Editor defaultValue={BLOCKS} rulePalette={{ ...RULE_PALETTE, onRuleApplied }} />,
    );
    // BLOCKS are 'text'; the Email rule only applies to 'input'.
    focusBlock(container, '1');
    fireEvent.click(screen.getByText('Email'));
    expect(onRuleApplied).not.toHaveBeenCalled();
  });

  it('renders both panes when sidebar and rulePalette are set', () => {
    const sidebar: EditorSidebarConfig = {
      items: [{ id: 'heading', label: 'Heading', category: 'Text' }],
      categories: ['Text'],
    };
    render(<Editor defaultValue={BLOCKS} sidebar={sidebar} rulePalette={RULE_PALETTE} />);
    expect(screen.getByRole('complementary', { name: 'Block palette' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Rule palette' })).toBeInTheDocument();
  });
});
