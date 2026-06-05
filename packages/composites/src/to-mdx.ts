import type { CompositeBlock } from './manifest';
import { kebabToPascal, walkBlocks } from './walk-blocks';

function visitBlock(block: CompositeBlock, children: string[]): string {
  const { type, content, meta } = block;

  if (type === 'text') return `<p>${content ?? ''}</p>`;
  if (type === 'heading') {
    const level = (meta?.level as number) ?? 2;
    return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${content ?? ''}`;
  }
  if (type === 'blockquote') return `> ${content ?? ''}`;
  if (type === 'list') {
    const items = Array.isArray(content) ? (content as string[]) : [];
    const ordered = meta?.ordered === true;
    return items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join('\n');
  }
  if (type === 'grid') {
    const columns = (meta?.columns as number) ?? 1;
    return `<Grid columns={${columns}}>\n${children.join('\n')}\n</Grid>`;
  }
  if (type === 'divider') return '---';
  if (type.startsWith('composite:')) {
    const name = kebabToPascal(type.slice('composite:'.length));
    return name ? `<${name} />` : `<!-- invalid composite type: ${type} -->`;
  }

  return `<!-- unknown block type: ${type} -->`;
}

export function toMdx(blocks: CompositeBlock[]): string {
  if (blocks.length === 0) return '';
  return walkBlocks(blocks, visitBlock, (r) => r.join('\n'));
}
