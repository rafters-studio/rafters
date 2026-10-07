// No DOM and no react-dom in this package: assert on the returned element's props.
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect, it } from 'vitest';
import type { CompositeBlock, CompositeFile } from '../src/manifest';
import { Composite, createComposites, type ToJsxOptions, toJsx } from '../src/to-jsx';

function Probe(props: Record<string, unknown>): ReactNode {
  return createElement('div', null, String(Object.keys(props).length));
}
const components = { datatable: Probe };

function element(node: ReactNode): ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error('expected an element');
  return node;
}

const rows = [{ id: 'a' }, { id: 'b' }];
const bound = (meta: Record<string, unknown>): CompositeBlock[] => [
  { id: 'table', type: 'datatable', meta },
];

it('resolves a top-level binding by reference', () => {
  const el = element(
    toJsx(bound({ data: { $bind: 'props.data' } }), { components, props: { data: rows } }),
  );
  expect(el.props.data).toBe(rows);
});

it('resolves deep paths and array indices', () => {
  const el = element(
    toJsx(bound({ name: { $bind: 'props.user.name' }, first: { $bind: 'props.rows.0' } }), {
      components,
      props: { user: { name: 'Ada' }, rows },
    }),
  );
  expect(el.props.name).toBe('Ada');
  expect(el.props.first).toBe(rows[0]);
});

it('resolves bindings nested in objects and arrays', () => {
  const el = element(
    toJsx(bound({ columns: [{ header: { $bind: 'props.h' }, width: 2 }] }), {
      components,
      props: { h: 'Name' },
    }),
  );
  expect(el.props.columns).toEqual([{ header: 'Name', width: 2 }]);
});

it('drops an unresolved nested binding from objects and keeps its array slot', () => {
  const el = element(
    toJsx(
      bound({ cell: { header: { $bind: 'props.h' }, width: 2 }, list: [{ $bind: 'props.h' }, 1] }),
      { components, props: {} },
    ),
  );
  const cell = el.props.cell;
  if (typeof cell !== 'object' || cell === null) throw new Error('expected an object');
  expect('header' in cell).toBe(false);
  expect(cell).toEqual({ width: 2 });
  const list = el.props.list;
  if (!Array.isArray(list)) throw new Error('expected an array');
  expect(list).toHaveLength(2);
  expect(list[0]).toBeUndefined();
  expect(list[1]).toBe(1);
});

it('omits an unresolved binding and never reads inherited keys', () => {
  expect(
    'data' in element(toJsx(bound({ data: { $bind: 'props.data' } }), { components })).props,
  ).toBe(false);
  const el = element(
    toJsx(bound({ ctor: { $bind: 'props.constructor' }, p: { $bind: 'props.__proto__' } }), {
      components,
      props: {},
    }),
  );
  expect('ctor' in el.props).toBe(false);
  expect('p' in el.props).toBe(false);
});

it('omits a binding that resolves to undefined', () => {
  const el = element(
    toJsx(bound({ data: { $bind: 'props.data' } }), { components, props: { data: undefined } }),
  );
  expect('data' in el.props).toBe(false);
});

it('passes null through', () => {
  const el = element(
    toJsx(bound({ data: { $bind: 'props.data' } }), { components, props: { data: null } }),
  );
  expect(el.props.data).toBeNull();
});

it('leaves static meta unchanged', () => {
  const meta = { level: 2, label: 'x', nested: { a: [1, 2] } };
  expect(element(toJsx(bound(meta), { components })).props).toEqual(meta);
  expect(element(toJsx(bound(meta), { components, props: { level: 9 } })).props).toEqual(meta);
});

it('passes non-plain values and binding-free subtrees through by reference', () => {
  const icon = createElement('svg');
  const when = new Date(0);
  const obj = { a: [1, 2], b: { c: 'd' } };
  const el = element(toJsx(bound({ icon, when, nested: obj }), { components, props: { x: 1 } }));
  expect(el.props.icon).toBe(icon);
  expect(el.props.when).toBe(when);
  expect(el.props.nested).toBe(obj);
});

it('still drops reserved props', () => {
  const el = element(
    toJsx(bound({ key: { $bind: 'props.k' } }), { components, props: { k: 'x' } }),
  );
  expect(el.key).toBe('table');
  // React's dev build defines a non-enumerable `key` warning getter on every
  // keyed element's props, so `'key' in el.props` is always true; the
  // enumerable keys are what the component actually receives.
  expect(Object.keys(el.props)).not.toContain('key');
});

it('throws on malformed bindings', () => {
  for (const bad of [
    { $bind: 'data' },
    { $bind: 'props' },
    { $bind: 'props.' },
    { $bind: 'props..x' },
    { $bind: 42 },
    { $bind: 'props.items', $count: true },
  ]) {
    expect(() => toJsx(bound({ data: bad }), { components, props: {} })).toThrow(
      'Invalid $bind in block "table" meta "data"',
    );
  }
});

it('names the top-level meta key for a nested malformed binding', () => {
  expect(() =>
    toJsx(bound({ columns: [{ header: { $bind: 'h' } }] }), { components, props: {} }),
  ).toThrow('Invalid $bind in block "table" meta "columns"');
});

it('Composite forwards props', () => {
  const file: CompositeFile = {
    manifest: {
      id: 'table',
      name: 'Table',
      category: 'data',
      description: '',
      keywords: [],
      cognitiveLoad: 3,
    },
    input: [],
    output: [],
    blocks: bound({ data: { $bind: 'props.data' } }),
  };
  expect(element(Composite({ file, components, props: { data: rows } })).props.data).toBe(rows);

  const a = { data: rows };
  const b = { data: [] };
  const { Table } = createComposites({ Table: file }, { components, props: a });
  if (!Table) throw new Error('expected Table');
  // createComposites builds function components; call one directly to inspect what it returns.
  const render = Table as (p: Partial<ToJsxOptions>) => ReactNode;
  expect(element(render({ props: b })).props.props).toBe(b);
  expect(element(render({})).props.props).toBe(a);
});
