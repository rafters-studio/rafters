import type { EditorBlock } from '@rafters/ui';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { blockquoteComposite } from '../src/typography/blockquote';
import { headingComposite } from '../src/typography/heading';
import { listComposite } from '../src/typography/list';
import { paragraphComposite } from '../src/typography/paragraph';

// ============================================================================
// Helpers
// ============================================================================

const defaultContext = { index: 0, total: 1, isSelected: false, isFocused: false };

function makeBlock(overrides: Partial<EditorBlock> = {}): EditorBlock {
  return {
    id: 'a11y-test-block',
    type: 'heading',
    content: '',
    ...overrides,
  };
}

// ============================================================================
// Heading a11y
// ============================================================================

describe('Heading a11y', () => {
  it('has no accessibility violations with content', async () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: 'Page Title', meta: { level: 1 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when empty (placeholder)', async () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: '', meta: { level: 2 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations for each heading level', async () => {
    const Render = headingComposite.Render;
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const block = makeBlock({ type: 'heading', content: `Level ${level}`, meta: { level } });
      const { container, unmount } = render(<Render block={block} context={defaultContext} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
      unmount();
    }
  });
});

// ============================================================================
// Paragraph a11y
// ============================================================================

describe('Paragraph a11y', () => {
  it('has no accessibility violations with content', async () => {
    const Render = paragraphComposite.Render;
    const block = makeBlock({ type: 'paragraph', content: 'Some body text here.' });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when empty (placeholder)', async () => {
    const Render = paragraphComposite.Render;
    const block = makeBlock({ type: 'paragraph', content: '' });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// Blockquote a11y
// ============================================================================

describe('Blockquote a11y', () => {
  it('has no accessibility violations with content', async () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: 'To be or not to be.',
      meta: { attribution: 'Shakespeare' },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations without attribution', async () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: 'A simple quote.',
      meta: { attribution: '' },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when empty (placeholder)', async () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: '',
      meta: { attribution: '' },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// List a11y
// ============================================================================

describe('List a11y', () => {
  it('has no accessibility violations for unordered list', async () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: ['Apple', 'Banana', 'Cherry'],
      meta: { ordered: false },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations for ordered list', async () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: ['First', 'Second', 'Third'],
      meta: { ordered: true },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with empty items', async () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: [''],
      meta: { ordered: false },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
