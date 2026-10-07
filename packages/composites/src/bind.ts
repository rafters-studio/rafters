/**
 * Resolves `{ "$bind": "<root>.<path>" }` meta values against consumer data.
 * The root is `props` or an `each`/`as` item name in scope.
 *
 * Pure and browser-safe: no node: imports and no React. The client bundle
 * pulls this in through client.ts, and the registry ships it as part of the
 * composites runtime.
 */

import { BindingSchema } from './manifest';

/** The consumer data a binding's `props.` path reads from. */
export type BindProps = Readonly<Record<string, unknown>>;

/** Item names bound by enclosing `each`/`as` blocks, each to its current item. */
export type BindLocals = Readonly<Record<string, unknown>>;

/** Marks a binding that is unresolved or resolved to `undefined`. */
const DROP: unique symbol = Symbol('drop');

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBindingCandidate(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value) && Object.hasOwn(value, '$bind');
}

/** Arrays and plain objects are walked; everything else is a leaf. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) return false;
  if (Object.hasOwn(value, '$$typeof')) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function readPath(
  path: string,
  props: BindProps,
  locals: BindLocals,
  blockId: string,
  metaKey: string,
): unknown {
  const [root = '', ...segments] = path.split('.');
  let current: unknown;
  if (root === 'props') current = props;
  else if (Object.hasOwn(locals, root)) current = locals[root];
  else
    throw new Error(
      `Invalid $bind in block "${blockId}" meta "${metaKey}": unknown scope "${root}"`,
    );
  for (const segment of segments) {
    if (!isObject(current) || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function walk(
  value: unknown,
  props: BindProps,
  locals: BindLocals,
  blockId: string,
  metaKey: string,
): unknown {
  if (isBindingCandidate(value)) {
    const parsed = BindingSchema.safeParse(value);
    if (!parsed.success) {
      const reason = parsed.error.issues[0]?.message ?? 'invalid binding';
      throw new Error(`Invalid $bind in block "${blockId}" meta "${metaKey}": ${reason}`);
    }
    const resolved = readPath(parsed.data.$bind, props, locals, blockId, metaKey);
    return resolved === undefined ? DROP : resolved;
  }

  if (Array.isArray(value)) {
    let copy: unknown[] | undefined;
    for (let index = 0; index < value.length; index++) {
      const item: unknown = value[index];
      const next = walk(item, props, locals, blockId, metaKey);
      // Inside an array an unresolved binding keeps its slot so the length holds.
      const out = next === DROP ? undefined : next;
      if (Object.is(out, item)) continue;
      copy ??= value.slice();
      copy[index] = out;
    }
    return copy ?? value;
  }

  if (isPlainObject(value)) {
    let copy: Record<string, unknown> | undefined;
    for (const [key, item] of Object.entries(value)) {
      const next = walk(item, props, locals, blockId, metaKey);
      if (Object.is(next, item)) continue;
      if (!copy) {
        const fresh: Record<string, unknown> = Object.create(Object.getPrototypeOf(value));
        copy = Object.assign(fresh, value);
      }
      if (next === DROP) delete copy[key];
      else copy[key] = next;
    }
    return copy ?? value;
  }

  return value;
}

/**
 * Return `meta` with every binding replaced by the value it reads from
 * `props` or from an item name in `locals`. Only arrays and plain objects on the path to a binding are copied;
 * every other value keeps its reference. Throws on a malformed binding or a
 * root that is neither `props` nor a name in `locals`.
 */
export function resolveBindings(
  meta: Readonly<Record<string, unknown>>,
  props: BindProps,
  blockId: string,
  locals: BindLocals = {},
): Record<string, unknown> {
  let copy: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(meta)) {
    const next = walk(value, props, locals, blockId, key);
    if (Object.is(next, value)) continue;
    copy ??= { ...meta };
    if (next === DROP) delete copy[key];
    else copy[key] = next;
  }
  return copy ?? { ...meta };
}
