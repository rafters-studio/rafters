import { type ComponentType, createElement, type ReactNode } from 'react';
import type { CompositeBlock, CompositeFile } from './manifest';

const MAX_DEPTH = 50;

export interface ToJsxOptions {
  components?: Record<string, ComponentType<Record<string, unknown>>>;
  resolveComposite?: (id: string) => CompositeFile | null;
  fallback?: ComponentType<{ type: string }>;
}

export interface CompositeProps {
  file?: CompositeFile;
  blocks?: CompositeBlock[];
  components?: Record<string, ComponentType<Record<string, unknown>>>;
  resolveComposite?: (id: string) => CompositeFile | null;
  fallback?: ComponentType<{ type: string }>;
}

function kebabToPascal(kebab: string): string {
  const parts = kebab.split('-').filter((p) => p.length > 0);
  if (parts.length === 0) return '';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function renderBlock(
  block: CompositeBlock,
  blockMap: Map<string, CompositeBlock>,
  options: ToJsxOptions,
  visited: Set<string>,
  depth: number,
): ReactNode {
  if (depth > MAX_DEPTH) return null;
  if (visited.has(block.id)) return null;
  visited.add(block.id);

  const { type, content, children, meta } = block;
  const components = options.components ?? {};

  if (type.startsWith('composite:')) {
    const compositeId = type.slice('composite:'.length);
    const resolved = options.resolveComposite?.(compositeId);
    if (!resolved) return null;
    return toJsx(resolved.blocks, options);
  }

  const Component = components[type] ?? components[kebabToPascal(type)];

  if (!Component) {
    if (options.fallback) {
      return createElement(options.fallback, { key: block.id, type });
    }
    return null;
  }

  const props: Record<string, unknown> = {
    key: block.id,
    ...(meta ?? {}),
  };

  const childNodes: ReactNode[] = [];

  if (children && children.length > 0) {
    for (const childId of children) {
      const child = blockMap.get(childId);
      if (!child) continue;
      childNodes.push(renderBlock(child, blockMap, options, new Set(visited), depth + 1));
    }
  }

  if (content !== undefined) {
    if (Array.isArray(content)) {
      props.content = content;
    } else {
      childNodes.unshift(String(content));
    }
  }

  return createElement(Component, props, childNodes.length > 0 ? childNodes : undefined);
}

export function toJsx(blocks: CompositeBlock[], options: ToJsxOptions = {}): ReactNode {
  if (blocks.length === 0) return null;

  const blockMap = new Map<string, CompositeBlock>();
  for (const block of blocks) {
    blockMap.set(block.id, block);
  }

  const roots = blocks.filter((block) => !block.parentId);
  const elements = roots.map((block) => renderBlock(block, blockMap, options, new Set(), 0));

  return elements.length === 1 ? elements[0] : createElement('div', null, ...elements);
}

export function Composite({
  file,
  blocks,
  components,
  resolveComposite,
  fallback,
}: CompositeProps): ReactNode {
  const source = file?.blocks ?? blocks ?? [];
  const opts: ToJsxOptions = {};
  if (components) opts.components = components;
  if (resolveComposite) opts.resolveComposite = resolveComposite;
  if (fallback) opts.fallback = fallback;
  return toJsx(source, opts);
}

export function createComposites(
  composites: Record<string, CompositeFile>,
  options: Omit<ToJsxOptions, 'resolveComposite'> = {},
): Record<string, (props?: Partial<CompositeProps>) => ReactNode> {
  const resolver = (id: string): CompositeFile | null => {
    for (const file of Object.values(composites)) {
      if (file.manifest.id === id) return file;
    }
    return composites[id] ?? null;
  };

  const result: Record<string, (props?: Partial<CompositeProps>) => ReactNode> = {};

  for (const [name, file] of Object.entries(composites)) {
    const Component = (props?: Partial<CompositeProps>): ReactNode => {
      const merged: CompositeProps = { file };
      const c = props?.components ?? options.components;
      const r = props?.resolveComposite ?? resolver;
      const f = props?.fallback ?? options.fallback;
      if (c) merged.components = c;
      if (r) merged.resolveComposite = r;
      if (f) merged.fallback = f;
      return Composite(merged);
    };
    Object.defineProperty(Component, 'name', { value: name });
    result[name] = Component;
  }

  return result;
}
