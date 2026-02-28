/**
 * Blockquote composite block
 *
 * Renders a styled <blockquote> with optional attribution.
 * Cognitive load: 1 -- quote text with optional citation.
 */

import type { EditorBlock } from '@rafters/ui';
import classy from '@rafters/ui/primitives/classy';
import type { CompositeDefinition } from '../manifest.js';

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER = 'Quote...';

// ============================================================================
// Helpers
// ============================================================================

function resolveAttribution(meta: Record<string, unknown> | undefined): string {
  const raw = meta?.attribution;
  if (typeof raw === 'string' && raw.length > 0) {
    return raw;
  }
  return '';
}

// ============================================================================
// Preview
// ============================================================================

function BlockquotePreview(_props: { scale?: number }) {
  return <span className={classy('text-foreground italic')}>&ldquo;Quote&rdquo;</span>;
}

// ============================================================================
// Render
// ============================================================================

function BlockquoteRender({
  block,
}: {
  block: EditorBlock;
  context: { index: number; total: number; isSelected: boolean; isFocused: boolean };
}) {
  const text = typeof block.content === 'string' && block.content.length > 0 ? block.content : null;
  const attribution = resolveAttribution(block.meta);

  return (
    <blockquote
      className={classy('border-l-4 border-border pl-4 py-2', {
        'text-foreground': !!text,
        'text-muted-foreground': !text,
      })}
    >
      <p className={classy('text-base italic leading-7')}>{text ?? PLACEHOLDER}</p>
      {attribution.length > 0 && (
        <footer className={classy('mt-2 text-sm text-muted-foreground')}>
          &mdash; <cite>{attribution}</cite>
        </footer>
      )}
    </blockquote>
  );
}

// ============================================================================
// Composite Definition
// ============================================================================

export const blockquoteComposite: CompositeDefinition = {
  manifest: {
    id: 'blockquote',
    name: 'Blockquote',
    category: 'typography',
    description: 'A quote block with optional attribution',
    keywords: ['quote', 'citation'],
    cognitiveLoad: 1,
    defaultBlock: { type: 'blockquote', content: '', meta: { attribution: '' } },
  },
  Preview: BlockquotePreview,
  Render: BlockquoteRender,
};
