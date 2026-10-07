// Repeat (each/as) in toJsx. Same helpers as test/to-jsx.test.ts:
// a Probe component and element() narrowing via isValidElement; no DOM.
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect, it } from 'vitest';
import { CompositeFileSchema, type CompositeBlock } from '../src/manifest';
import { toJsx } from '../src/to-jsx';

function Probe(props: Record<string, unknown>): ReactNode {
  return createElement('div', null, String(Object.keys(props).length));
}
const components = { list: Probe, card: Probe, row: Probe, cell: Probe, a: Probe, b: Probe };

function element(node: unknown): ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error('expected an element');
  return node;
}
function kids(node: unknown): ReactElement<Record<string, unknown>>[] {
  const c = element(node).props.children;
  if (c === undefined) return [];
  return (Array.isArray(c) ? c : [c]).map(element);
}

const listOfCards = (cardExtra: Partial<CompositeBlock>): CompositeBlock[] => [
  { id: 'list', type: 'list', children: ['card'] },
  { id: 'card', type: 'card', parentId: 'list', ...cardExtra },
];

it('renders one copy per item with deterministic keys', () => {
  const blocks = listOfCards({
    each: { $bind: 'props.questions' },
    as: 'q',
    meta: { title: { $bind: 'q.title' } },
  });
  const cards = kids(
    toJsx(blocks, { components, props: { questions: [{ title: 'A' }, { title: 'B' }] } }),
  );
  expect(cards.map((c) => c.key)).toEqual(['card:0', 'card:1']);
  expect(cards.map((c) => c.props.title)).toEqual(['A', 'B']);
});

it('binds the whole item by its as name', () => {
  const item = { title: 'A' };
  const blocks = listOfCards({
    each: { $bind: 'props.questions' },
    as: 'q',
    meta: { item: { $bind: 'q' } },
  });
  expect(kids(toJsx(blocks, { components, props: { questions: [item] } }))[0]?.props.item).toBe(
    item,
  );
});

it('suffixes nested repeats', () => {
  const blocks: CompositeBlock[] = [
    { id: 'row', type: 'row', each: { $bind: 'props.rows' }, as: 'r', children: ['cell'] },
    {
      id: 'cell',
      type: 'cell',
      parentId: 'row',
      each: { $bind: 'r.cells' },
      as: 'c',
      meta: { v: { $bind: 'c' } },
    },
  ];
  const rows = [{ cells: ['x', 'y'] }];
  const root = element(toJsx(blocks, { components, props: { rows } }));
  expect(root.key).toBe('row:0');
  const cells = kids(root);
  expect(cells.map((c) => c.key)).toEqual(['cell:0:0', 'cell:0:1']);
  expect(cells[1]?.props.v).toBe('y');
});

it('shadows an outer as name', () => {
  const blocks: CompositeBlock[] = [
    { id: 'row', type: 'row', each: { $bind: 'props.outer' }, as: 'x', children: ['cell'] },
    {
      id: 'cell',
      type: 'cell',
      parentId: 'row',
      each: { $bind: 'props.inner' },
      as: 'x',
      meta: { v: { $bind: 'x.v' } },
    },
  ];
  const root = toJsx(blocks, { components, props: { outer: [{ v: 1 }], inner: [{ v: 2 }] } });
  expect(kids(root)[0]?.props.v).toBe(2);
});

it('renders zero copies for absent, null or empty arrays', () => {
  const blocks = listOfCards({ each: { $bind: 'props.questions' }, as: 'q' });
  for (const props of [{}, { questions: null }, { questions: [] }]) {
    expect(kids(toJsx(blocks, { components, props }))).toEqual([]);
  }
});

it('throws when each resolves to a non-array', () => {
  const blocks = listOfCards({ each: { $bind: 'props.questions' }, as: 'q' });
  expect(() => toJsx(blocks, { components, props: { questions: 'nope' } })).toThrow(
    'Invalid each in block "card": expected an array, got string',
  );
});

it('throws on an out-of-scope binding root', () => {
  const blocks = listOfCards({ meta: { title: { $bind: 'q.title' } } });
  expect(() => toJsx(blocks, { components, props: {} })).toThrow(
    'Invalid $bind in block "card" meta "title"',
  );
});

it('keeps today semantics for blocks without each', () => {
  const blocks: CompositeBlock[] = [
    { id: 'list', type: 'list', children: ['card', 'card'] },
    { id: 'card', type: 'card', parentId: 'list' },
  ];
  const cards = kids(toJsx(blocks, { components }));
  expect(cards.map((c) => c.key)).toEqual(['card']);
});

it('stops a cycle through a repeated block', () => {
  const blocks: CompositeBlock[] = [
    { id: 'a', type: 'a', each: { $bind: 'props.items' }, as: 'i', children: ['b'] },
    { id: 'b', type: 'b', parentId: 'a', children: ['a'] },
  ];
  const result = element(toJsx(blocks, { components, props: { items: [1, 2] } }));
  const copies = kids(result);
  expect(copies.map((c) => c.key)).toEqual(['a:0', 'a:1']);
  for (const copy of copies) {
    const [b] = kids(copy);
    expect(kids(b)).toEqual([]);
  }
});

it('rejects unpaired or malformed each/as', () => {
  const file = (block: Record<string, unknown>) => ({
    manifest: {
      id: 'x',
      name: 'X',
      category: 'c',
      description: '',
      keywords: [],
      cognitiveLoad: 1,
    },
    blocks: [{ id: 'b', type: 'card', ...block }],
  });
  expect(CompositeFileSchema.safeParse(file({ each: { $bind: 'props.a' } })).success).toBe(false);
  expect(CompositeFileSchema.safeParse(file({ as: 'q' })).success).toBe(false);
  expect(
    CompositeFileSchema.safeParse(file({ each: { $bind: 'props.a' }, as: 'props' })).success,
  ).toBe(false);
  expect(
    CompositeFileSchema.safeParse(file({ each: { $bind: 'props.a' }, as: '1q' })).success,
  ).toBe(false);
  expect(CompositeFileSchema.safeParse(file({ each: { $bind: 'props.a' }, as: 'q' })).success).toBe(
    true,
  );
});
