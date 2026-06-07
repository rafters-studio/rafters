import type { CompositeBlock } from './manifest';
import { kebabToPascal, walkBlocks } from './walk-blocks';

function serializeProps(meta: Record<string, unknown> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) => (typeof v === 'string' ? ` ${k}="${v}"` : ` ${k}={${JSON.stringify(v)}}`))
    .join('');
}

function visitBlock(block: CompositeBlock, children: string[]): string {
  const { type, content, meta } = block;
  const tag = kebabToPascal(type);
  const props = serializeProps(meta);

  if (type.startsWith('composite:')) {
    const name = kebabToPascal(type.slice('composite:'.length));
    return name ? `<${name} />` : '';
  }

  if (children.length > 0) {
    return `<${tag}${props}>\n${children.join('\n')}\n</${tag}>`;
  }

  if (content !== undefined) {
    if (Array.isArray(content)) {
      const items = (content as string[]).map((item) => `  <li>${item}</li>`).join('\n');
      return `<${tag}${props}>\n${items}\n</${tag}>`;
    }
    return `<${tag}${props}>${String(content)}</${tag}>`;
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
