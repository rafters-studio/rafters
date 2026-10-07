import { type ComponentType, createElement, Fragment, type ReactNode } from 'react';
import type { ZodType } from 'zod';
import { type BindProps, resolveBindings } from './bind';
import { checkEmbedInput } from './embed';
import type { CompositeBlock, CompositeFile } from './manifest';
import { resolveBlockTag } from './resolve-block';
import { type BlockScope, kebabToPascal, walkScopedBlocks } from './walk-blocks';

export interface ToJsxOptions {
  components?: Record<string, ComponentType<Record<string, unknown>>>;
  fallback?: ComponentType<{ type: string }>;
  /** Consumer data that `{ "$bind": "props.<path>" }` meta values resolve against. */
  props?: BindProps;
  /** Look up a composite by manifest id for `composite:<id>` blocks. Without it, those blocks render as today. */
  resolveComposite?: (id: string) => CompositeFile | null;
  /** Rule schemas by rule name, used to check the values passed into an embedded composite's input. */
  rules?: Readonly<Record<string, ZodType>>;
}

export interface CompositeProps extends ToJsxOptions {
  file?: CompositeFile;
  blocks?: CompositeBlock[];
}

const RESERVED_PROPS = new Set(['key', 'ref', 'children']);

function createVisitor(options: ToJsxOptions, chain: readonly string[]) {
  const components = options.components ?? {};
  const resolveComposite = options.resolveComposite;

  return (block: CompositeBlock, children: ReactNode[], scope: BlockScope): ReactNode => {
    if (resolveComposite) {
      const tag = resolveBlockTag(block.type);
      if (tag.kind === 'composite') {
        return renderEmbed(block, tag.id, resolveComposite, scope, options, chain);
      }
    }

    const Component = components[block.type] ?? components[kebabToPascal(block.type)];

    if (!Component) {
      if (options.fallback)
        return createElement(options.fallback, { key: scope.key, type: block.type });
      return null;
    }

    const props: Record<string, unknown> = { key: scope.key };
    if (block.meta) {
      const meta = resolveBindings(block.meta, options.props ?? {}, block.id, scope.locals);
      for (const [k, v] of Object.entries(meta)) {
        if (!RESERVED_PROPS.has(k)) props[k] = v;
      }
    }

    if (block.content !== undefined) {
      if (Array.isArray(block.content)) {
        props.content = block.content;
      } else {
        children = [String(block.content), ...children];
      }
    }

    return createElement(Component, props, children.length > 0 ? children : undefined);
  };
}

/**
 * Render a `composite:<id>` block as the referenced composite's root results,
 * spread into a Fragment keyed by the embedding block. The embedded composite
 * sees only its checked input: no parent props and no repeat locals. The
 * embedding block's own children are not rendered.
 */
function renderEmbed(
  block: CompositeBlock,
  id: string,
  resolveComposite: (id: string) => CompositeFile | null,
  scope: BlockScope,
  options: ToJsxOptions,
  chain: readonly string[],
): ReactNode {
  const target = resolveComposite(id);
  if (!target) {
    throw new Error(`Unresolved composite reference "composite:${id}" in block "${block.id}"`);
  }
  if (chain.includes(id)) {
    throw new Error(`Composite cycle: ${[...chain, id].join(' -> ')}`);
  }

  const meta = resolveBindings(block.meta ?? {}, options.props ?? {}, block.id, scope.locals);
  const input = checkEmbedInput(block.id, target, meta, options.rules ?? {});
  return render(target.blocks, { ...options, props: input }, [...chain, id], (roots) =>
    createElement(Fragment, { key: scope.key }, ...roots),
  );
}

/** The walk behind `toJsx`; `chain` holds the composite ids being expanded. */
function render(
  blocks: CompositeBlock[],
  options: ToJsxOptions,
  chain: readonly string[],
  join: (roots: ReactNode[]) => ReactNode,
): ReactNode {
  const props = options.props ?? {};
  return walkScopedBlocks(
    blocks,
    createVisitor(options, chain),
    join,
    (block, locals) => resolveBindings({ each: block.each }, props, block.id, locals).each,
  );
}

export function toJsx(blocks: CompositeBlock[], options: ToJsxOptions = {}): ReactNode {
  if (blocks.length === 0) return null;
  return render(blocks, options, [], (r) =>
    r.length === 1 ? (r[0] ?? null) : createElement('div', null, ...r),
  );
}

export function Composite({
  file,
  blocks,
  components,
  fallback,
  props,
  resolveComposite,
  rules,
}: CompositeProps): ReactNode {
  const source = file?.blocks ?? blocks ?? [];
  const opts: ToJsxOptions = {};
  if (components) opts.components = components;
  if (fallback) opts.fallback = fallback;
  if (props) opts.props = props;
  if (resolveComposite) opts.resolveComposite = resolveComposite;
  if (rules) opts.rules = rules;
  return toJsx(source, opts);
}

export function createComposites(
  composites: Record<string, CompositeFile>,
  options: ToJsxOptions = {},
): Record<string, ComponentType<Partial<ToJsxOptions>>> {
  const result: Record<string, ComponentType<Partial<ToJsxOptions>>> = {};

  for (const [name, file] of Object.entries(composites)) {
    const Component = (props: Partial<ToJsxOptions> = {}): ReactNode => {
      const merged: CompositeProps = { file };
      const c = props.components ?? options.components;
      const f = props.fallback ?? options.fallback;
      if (c) merged.components = c;
      if (f) merged.fallback = f;
      const p = props.props ?? options.props;
      if (p) merged.props = p;
      const resolve = props.resolveComposite ?? options.resolveComposite;
      if (resolve) merged.resolveComposite = resolve;
      const rules = props.rules ?? options.rules;
      if (rules) merged.rules = rules;
      return createElement(Composite, merged);
    };
    Component.displayName = name;
    result[name] = Component;
  }

  return result;
}
