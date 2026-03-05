/**
 * JSON-to-MDX serializer
 *
 * Walks a flat CompositeBlock array and emits MDX output.
 * Only top-level blocks (no parentId) render at root.
 * Child blocks render inline within their parent.
 */

import type { CompositeBlock } from './manifest';

const MAX_DEPTH = 50;

function kebabToPascal(kebab: string): string {
  const parts = kebab.split('-').filter((p) => p.length > 0);
  if (parts.length === 0) return '';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function serializeBlock(
  block: CompositeBlock,
  blockMap: Map<string, CompositeBlock>,
  visited = new Set<string>(),
  depth = 0,
): string {
  if (depth > MAX_DEPTH) return '<!-- max nesting depth exceeded -->';
  if (visited.has(block.id)) return '<!-- circular reference detected -->';
  visited.add(block.id);

  const { type, content, children, meta } = block;

  if (type === 'text') {
    return `<p>${content ?? ''}</p>`;
  }

  if (type === 'heading') {
    const level = (meta?.level as number) ?? 2;
    const hashes = '#'.repeat(Math.min(Math.max(level, 1), 6));
    return `${hashes} ${content ?? ''}`;
  }

  if (type === 'blockquote') {
    return `> ${content ?? ''}`;
  }

  if (type === 'list') {
    const items = Array.isArray(content) ? (content as string[]) : [];
    const ordered = meta?.ordered === true;
    return items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join('\n');
  }

  if (type.startsWith('composite:')) {
    const name = kebabToPascal(type.slice('composite:'.length));
    if (!name) return `<!-- invalid composite type: ${type} -->`;
    return `<${name} />`;
  }

  if (type === 'grid') {
    const columns = (meta?.columns as number) ?? 1;
    const childContent = (children ?? [])
      .map((childId) => blockMap.get(childId))
      .filter((child): child is CompositeBlock => child != null)
      .map((child) => serializeBlock(child, blockMap, new Set(visited), depth + 1))
      .join('\n');
    return `<Grid columns={${columns}}>\n${childContent}\n</Grid>`;
  }

  if (type === 'divider') {
    return '---';
  }

  return `<!-- unknown block type: ${type} -->`;
}

/**
 * Serialize a flat array of CompositeBlocks to MDX string.
 * Only top-level blocks (no parentId) are serialized at the root.
 * Child blocks render inline within their parent.
 */
export function toMdx(blocks: CompositeBlock[]): string {
  if (blocks.length === 0) return '';

  const blockMap = new Map<string, CompositeBlock>();
  for (const block of blocks) {
    blockMap.set(block.id, block);
  }

  return blocks
    .filter((block) => !block.parentId)
    .map((block) => serializeBlock(block, blockMap))
    .join('\n');
}
