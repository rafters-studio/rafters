/**
 * Paragraph composite block
 *
 * Renders body text in a semantic <p> element.
 * Cognitive load: 1 -- the simplest text block.
 */

import type { EditorBlock } from '@rafters/ui';
import classy from '@rafters/ui/primitives/classy';
import type { CompositeDefinition } from '../manifest.js';

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER = 'Type something...';

// ============================================================================
// Preview
// ============================================================================

function ParagraphPreview({ scale = 1 }: { scale?: number }) {
  const fontSize = 14 * scale;
  return (
    <span className={classy('text-foreground')} style={{ fontSize: `${fontSize}px` }}>
      Paragraph
    </span>
  );
}

// ============================================================================
// Render
// ============================================================================

function ParagraphRender({
  block,
}: {
  block: EditorBlock;
  context: { index: number; total: number; isSelected: boolean; isFocused: boolean };
}) {
  const text = typeof block.content === 'string' && block.content.length > 0 ? block.content : null;

  return (
    <p
      className={classy('text-base leading-7', {
        'text-foreground': !!text,
        'text-muted-foreground': !text,
      })}
    >
      {text ?? PLACEHOLDER}
    </p>
  );
}

// ============================================================================
// Composite Definition
// ============================================================================

export const paragraphComposite: CompositeDefinition = {
  manifest: {
    id: 'paragraph',
    name: 'Paragraph',
    category: 'typography',
    description: 'A body text paragraph block',
    keywords: ['text', 'body', 'content'],
    cognitiveLoad: 1,
    defaultBlock: { type: 'paragraph', content: '' },
  },
  Preview: ParagraphPreview,
  Render: ParagraphRender,
};
