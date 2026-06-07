import escapeHtml from 'escape-html';
import type { CompositeBlock } from './manifest';
import { kebabToPascal, walkBlocks } from './walk-blocks';

function serializeProps(meta: Record<string, unknown> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) =>
      typeof v === 'string' ? ` ${k}="${escapeHtml(v)}"` : ` ${k}={${JSON.stringify(v)}}`,
    )
    .join('');
}

function visitBlock(block: CompositeBlock, children: string[]): string {
  const { type, content, meta } = block;

  if (type.startsWith('composite:')) {
    const name = kebabToPascal(type.slice('composite:'.length));
    return name ? `<${name} />` : '';
  }

  const tag = kebabToPascal(type);
  const props = serializeProps(meta);

  if (children.length > 0) {
    return `<${tag}${props}>\n${children.join('\n')}\n</${tag}>`;
  }

  if (content !== undefined) {
    if (Array.isArray(content)) {
      const listTag = meta?.ordered === true ? 'ol' : 'ul';
      const items = (content as string[])
        .map((item) => `  <li>${escapeHtml(item)}</li>`)
        .join('\n');
      return `<${listTag}>\n${items}\n</${listTag}>`;
    }
    return `<${tag}${props}>${escapeHtml(String(content))}</${tag}>`;
  }

  return `<${tag}${props} />`;
}

function collectImports(blocks: CompositeBlock[]): string[] {
  const types = new Set<string>();
  for (const block of blocks) {
    if (!block.type.startsWith('composite:')) {
      types.add(block.type);
    }
  }
  return [...types].sort().map((type) => {
    const name = kebabToPascal(type);
    return `import ${name} from '../components/ui/${type}.astro';`;
  });
}

export function toAstro(blocks: CompositeBlock[]): string {
  if (blocks.length === 0) return '';

  const imports = collectImports(blocks);
  const body = walkBlocks(blocks, visitBlock, (r) => r.join('\n'));

  if (imports.length === 0) return body;

  return `---\n${imports.join('\n')}\n---\n\n${body}\n`;
}
