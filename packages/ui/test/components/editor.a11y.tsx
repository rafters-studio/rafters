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

  it('has no accessibility violations when disabled', async () => {
    const { container } = render(<Editor defaultValue={BLOCKS} disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('document surface has aria-label', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByLabelText('Document editor')).toBeInTheDocument();
  });

  it('blocks render as semantic HTML with data-block-id', () => {
    const { container } = render(<Editor defaultValue={BLOCKS} />);
    const blockEls = container.querySelectorAll('[data-block-id]');
    expect(blockEls).toHaveLength(3);
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

  it('canvas is focusable with tabIndex=0', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByLabelText('Document editor')).toHaveAttribute('tabindex', '0');
  });

  it('canvas is focusable and does not trap outline', () => {
    render(<Editor defaultValue={BLOCKS} />);
    expect(screen.getByLabelText('Document editor')).toHaveClass('outline-none');
  });

  it('disabled editor sets aria-disabled', () => {
    const { container } = render(<Editor disabled />);
    expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');
  });

  it('disabled canvas is not focusable', () => {
    render(<Editor defaultValue={BLOCKS} disabled />);
    expect(screen.getByLabelText('Document editor')).toHaveAttribute('tabindex', '-1');
  });
});
