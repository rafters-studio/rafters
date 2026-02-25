import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { EditorBlock } from '../../src/components/ui/editor';
import { Editor } from '../../src/components/ui/editor';

const BLOCKS: EditorBlock[] = [
  { id: '1', type: 'text', content: 'First block' },
  { id: '2', type: 'text', content: 'Second block' },
  { id: '3', type: 'text', content: 'Third block' },
];

describe('Editor - Accessibility', () => {
  it('has no accessibility violations on default render', async () => {
    const { container } = render(<Editor />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with blocks', async () => {
    const { container } = render(<Editor defaultValue={BLOCKS} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with toolbar', async () => {
    const { container } = render(<Editor defaultValue={BLOCKS} toolbar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with sidebar', async () => {
    const { container } = render(<Editor defaultValue={BLOCKS} sidebar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when disabled', async () => {
    const { container } = render(<Editor defaultValue={BLOCKS} disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('canvas has role="listbox" when blocks present', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('canvas omits role="listbox" when empty (ARIA requires option children)', () => {
    render(<Editor />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('canvas has aria-multiselectable="true" when blocks present', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('blocks have role="option"', () => {
    render(<Editor defaultValue={BLOCKS} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('blocks have aria-selected attribute', () => {
    render(<Editor defaultValue={BLOCKS} />);
    const options = screen.getAllByRole('option');
    for (const option of options) {
      expect(option).toHaveAttribute('aria-selected');
    }
  });

  it('toolbar has role="toolbar" and aria-label', () => {
    render(<Editor defaultValue={BLOCKS} toolbar />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Editor toolbar');
  });

  it('toolbar buttons have aria-label', () => {
    render(<Editor defaultValue={BLOCKS} toolbar />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('canvas is focusable with tabIndex=0 when blocks present', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '0');
  });

  it('canvas has visible focus indicator class', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByRole('listbox')).toHaveClass('focus-visible:ring-2');
  });

  it('sidebar navigation has aria-label', () => {
    render(<Editor defaultValue={BLOCKS} sidebar />);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Block navigation');
  });

  it('disabled editor sets aria-disabled', () => {
    const { container } = render(<Editor disabled />);
    expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
  });

  it('disabled canvas is not focusable', () => {
    render(<Editor defaultValue={BLOCKS} disabled />);
    expect(screen.getByRole('listbox')).toHaveAttribute('tabindex', '-1');
  });
});
