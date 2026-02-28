import type { EditorBlock } from '@rafters/ui';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CompositeManifestSchema } from '../src/manifest';
import { clear, get } from '../src/registry';
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
    id: 'test-block-1',
    type: 'heading',
    content: '',
    ...overrides,
  };
}

// ============================================================================
// Heading
// ============================================================================

describe('headingComposite', () => {
  it('has a valid manifest', () => {
    const result = CompositeManifestSchema.safeParse(headingComposite.manifest);
    expect(result.success).toBe(true);
  });

  it('Preview renders without errors', () => {
    const { container } = render(<headingComposite.Preview />);
    expect(container.textContent).toBe('Heading');
  });

  it('renders h2 by default', () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: 'Hello World', meta: { level: 2 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('Hello World');
  });

  it('renders h1 when level is 1', () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: 'Title', meta: { level: 1 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const heading = container.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('Title');
  });

  it('renders h3-h6 at their respective levels', () => {
    const Render = headingComposite.Render;
    for (const level of [3, 4, 5, 6]) {
      const { container, unmount } = render(
        <Render
          block={makeBlock({ content: `Level ${level}`, meta: { level } })}
          context={defaultContext}
        />,
      );
      const heading = container.querySelector(`h${level}`);
      expect(heading).not.toBeNull();
      expect(heading).toHaveTextContent(`Level ${level}`);
      unmount();
    }
  });

  it('shows placeholder when content is empty', () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: '', meta: { level: 2 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('Untitled');
  });

  it('defaults to h2 when level is invalid', () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: 'Test', meta: { level: 99 } });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('Test');
  });

  it('defaults to h2 when meta is undefined', () => {
    const Render = headingComposite.Render;
    const block = makeBlock({ type: 'heading', content: 'No Meta' });
    const { container } = render(<Render block={block} context={defaultContext} />);

    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('No Meta');
  });
});

// ============================================================================
// Paragraph
// ============================================================================

describe('paragraphComposite', () => {
  it('has a valid manifest', () => {
    const result = CompositeManifestSchema.safeParse(paragraphComposite.manifest);
    expect(result.success).toBe(true);
  });

  it('Preview renders without errors', () => {
    const { container } = render(<paragraphComposite.Preview />);
    expect(container.textContent).toBe('Paragraph');
  });

  it('renders paragraph text', () => {
    const Render = paragraphComposite.Render;
    const block = makeBlock({ type: 'paragraph', content: 'Hello world.' });
    render(<Render block={block} context={defaultContext} />);

    const p = screen.getByText('Hello world.');
    expect(p.tagName).toBe('P');
  });

  it('shows placeholder when content is empty', () => {
    const Render = paragraphComposite.Render;
    const block = makeBlock({ type: 'paragraph', content: '' });
    render(<Render block={block} context={defaultContext} />);

    const p = screen.getByText('Type something...');
    expect(p.tagName).toBe('P');
  });

  it('shows placeholder when content is not a string', () => {
    const Render = paragraphComposite.Render;
    const block = makeBlock({ type: 'paragraph', content: 42 });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getByText('Type something...')).toBeInTheDocument();
  });
});

// ============================================================================
// Blockquote
// ============================================================================

describe('blockquoteComposite', () => {
  it('has a valid manifest', () => {
    const result = CompositeManifestSchema.safeParse(blockquoteComposite.manifest);
    expect(result.success).toBe(true);
  });

  it('Preview renders without errors', () => {
    const { container } = render(<blockquoteComposite.Preview />);
    expect(container.textContent).toContain('Quote');
  });

  it('renders quote text in a blockquote element', () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: 'To be or not to be.',
      meta: { attribution: '' },
    });
    render(<Render block={block} context={defaultContext} />);

    const bq = screen.getByText('To be or not to be.');
    expect(bq.closest('blockquote')).toBeInTheDocument();
  });

  it('renders attribution when present', () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: 'To be or not to be.',
      meta: { attribution: 'Shakespeare' },
    });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getByText('Shakespeare')).toBeInTheDocument();
    const cite = screen.getByText('Shakespeare').closest('cite');
    expect(cite).toBeInTheDocument();
  });

  it('does not render attribution footer when attribution is empty', () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: 'A quote.',
      meta: { attribution: '' },
    });
    const { container } = render(<Render block={block} context={defaultContext} />);

    expect(container.querySelector('footer')).toBeNull();
    expect(container.querySelector('cite')).toBeNull();
  });

  it('shows placeholder when content is empty', () => {
    const Render = blockquoteComposite.Render;
    const block = makeBlock({
      type: 'blockquote',
      content: '',
      meta: { attribution: '' },
    });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getByText('Quote...')).toBeInTheDocument();
  });
});

// ============================================================================
// List
// ============================================================================

describe('listComposite', () => {
  it('has a valid manifest', () => {
    const result = CompositeManifestSchema.safeParse(listComposite.manifest);
    expect(result.success).toBe(true);
  });

  it('Preview renders without errors', () => {
    const { container } = render(<listComposite.Preview />);
    expect(container.textContent).toBe('List');
  });

  it('renders an unordered list by default', () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: ['Apple', 'Banana', 'Cherry'],
      meta: { ordered: false },
    });
    render(<Render block={block} context={defaultContext} />);

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('renders an ordered list when meta.ordered is true', () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: ['First', 'Second'],
      meta: { ordered: true },
    });
    render(<Render block={block} context={defaultContext} />);

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
  });

  it('renders a single empty item when content is empty array', () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: [],
      meta: { ordered: false },
    });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders a single empty item when content is not an array', () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: 'not an array',
      meta: { ordered: false },
    });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('coerces non-string items to strings', () => {
    const Render = listComposite.Render;
    const block = makeBlock({
      type: 'list',
      content: [42, null, 'text'],
      meta: { ordered: false },
    });
    render(<Render block={block} context={defaultContext} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});

// ============================================================================
// Auto-registration
// ============================================================================

describe('typography auto-registration', () => {
  afterEach(() => {
    clear();
  });

  it('registers all four typography composites on import', async () => {
    // Dynamic import triggers the side-effect registration
    await import('../src/typography/index');

    expect(get('heading')).toBeDefined();
    expect(get('paragraph')).toBeDefined();
    expect(get('blockquote')).toBeDefined();
    expect(get('list')).toBeDefined();
  });
});
