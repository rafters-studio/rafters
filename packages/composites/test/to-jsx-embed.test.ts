// No DOM: assert on returned elements.
import { createElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect, it } from 'vitest';
import { z } from 'zod';
import type { CompositeBlock, CompositeFile } from '../src/manifest';
import { toJsx } from '../src/to-jsx';

function Probe(props: Record<string, unknown>): ReactNode {
  return createElement('div', null, String(Object.keys(props).length));
}
function Fallback({ type }: { type: string }): ReactNode {
  return createElement('div', null, type);
}
const components = { heading: Probe };

function element(node: unknown): ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error('expected an element');
  return node;
}

function composite(id: string, input: string[], blocks: CompositeBlock[]): CompositeFile {
  return {
    manifest: { id, name: id, category: 'c', description: '', keywords: [], cognitiveLoad: 1 },
    input,
    output: [],
    blocks,
  };
}

const card = composite(
  'question-card',
  ['question'],
  [
    {
      id: 'title',
      type: 'heading',
      meta: { text: { $bind: 'props.question.title' }, leak: { $bind: 'props.q' } },
    },
  ],
);
const registry = new Map<string, CompositeFile>([['question-card', card]]);
const resolveComposite = (id: string) => registry.get(id) ?? null;
const rules = { question: z.object({ title: z.string() }) };
const embed = (meta: Record<string, unknown>): CompositeBlock[] => [
  { id: 'embed', type: 'composite:question-card', meta },
];

it('embeds with checked input and no parent leakage', () => {
  const out = element(
    toJsx(embed({ question: { $bind: 'props.q' } }), {
      components,
      resolveComposite,
      rules,
      props: { q: { title: 'Why' } },
    }),
  );
  expect(out.type).toBe(Fragment);
  expect(out.key).toBe('embed');
  const title = element(out.props.children);
  expect(title.props.text).toBe('Why');
  expect('leak' in title.props).toBe(false);
});

it('drops fields the rule does not declare', () => {
  const card2 = composite(
    'question-card',
    ['question'],
    [{ id: 'title', type: 'heading', meta: { status: { $bind: 'props.question.status' } } }],
  );
  const out = element(
    toJsx(embed({ question: { title: 'Why', status: 'open' } }), {
      components,
      rules,
      resolveComposite: (id) => (id === 'question-card' ? card2 : null),
    }),
  );
  expect('status' in element(out.props.children).props).toBe(false);
});

it('spreads a multi-root composite into the Fragment', () => {
  const two = composite(
    'two',
    [],
    [
      { id: 'x', type: 'heading', meta: { text: 'x' } },
      { id: 'y', type: 'heading', meta: { text: 'y' } },
    ],
  );
  const out = element(
    toJsx([{ id: 'e', type: 'composite:two' }], {
      components,
      resolveComposite: (id) => (id === 'two' ? two : null),
    }),
  );
  const roots = out.props.children;
  if (!Array.isArray(roots)) throw new Error('expected two children');
  expect(roots.map((r) => element(r).props.text)).toEqual(['x', 'y']);
});

it('embeds once per item under each/as', () => {
  const blocks: CompositeBlock[] = [
    { id: 'list', type: 'heading', children: ['card'] },
    {
      id: 'card',
      type: 'composite:question-card',
      parentId: 'list',
      each: { $bind: 'props.questions' },
      as: 'q',
      meta: { question: { $bind: 'q' } },
    },
  ];
  const list = element(
    toJsx(blocks, {
      components,
      resolveComposite,
      rules,
      props: { questions: [{ title: 'A' }, { title: 'B' }] },
    }),
  );
  const frags = (list.props.children as unknown[]).map(element);
  expect(frags.map((f) => [f.type, f.key])).toEqual([
    [Fragment, 'card:0'],
    [Fragment, 'card:1'],
  ]);
  expect(frags.map((f) => element(f.props.children).props.text)).toEqual(['A', 'B']);
});

it('passes the rule output, not the raw value', () => {
  const shout = composite(
    'shout',
    ['shout'],
    [{ id: 't', type: 'heading', meta: { text: { $bind: 'props.shout' } } }],
  );
  const out = element(
    toJsx([{ id: 'e', type: 'composite:shout', meta: { shout: 'hi' } }], {
      components,
      resolveComposite: (id) => (id === 'shout' ? shout : null),
      rules: { shout: z.string().transform((s) => s.toUpperCase()) },
    }),
  );
  expect(element(out.props.children).props.text).toBe('HI');
});

it('keeps today behavior without resolveComposite', () => {
  const out = element(toJsx(embed({}), { components, fallback: Fallback }));
  expect(out.type).toBe(Fallback);
  expect(out.props.type).toBe('composite:question-card');
});

it('rejects missing, unexpected, unknown-rule and failing inputs', () => {
  const opts = { components, resolveComposite, rules, props: { q: { title: 'Why' } } };
  expect(() => toJsx(embed({}), opts)).toThrow(
    'Missing input "question" for composite:question-card in block "embed"',
  );
  expect(() => toJsx(embed({ question: { $bind: 'props.q' }, extra: 1 }), opts)).toThrow(
    'Unexpected input "extra" for composite:question-card in block "embed"',
  );
  expect(() => toJsx(embed({ question: { $bind: 'props.q' } }), { ...opts, rules: {} })).toThrow(
    'No rule schema for input "question" of composite:question-card in block "embed"',
  );
  expect(() => toJsx(embed({ question: { title: 3 } }), opts)).toThrow(
    'Input "question" for composite:question-card in block "embed" failed its rule',
  );
});

it('embeds a zero-input composite and rejects meta on it', () => {
  const plain = composite('plain', [], [{ id: 't', type: 'heading', meta: { text: 'x' } }]);
  const resolve = (id: string) => (id === 'plain' ? plain : null);
  const out = element(
    toJsx([{ id: 'e', type: 'composite:plain' }], { components, resolveComposite: resolve }),
  );
  expect(element(out.props.children).props.text).toBe('x');
  expect(() =>
    toJsx([{ id: 'e', type: 'composite:plain', meta: { a: 1 } }], {
      components,
      resolveComposite: resolve,
    }),
  ).toThrow('Unexpected input "a" for composite:plain in block "e"');
});

it('throws on unresolved references and cycles', () => {
  expect(() =>
    toJsx([{ id: 'e', type: 'composite:nope' }], { components, resolveComposite }),
  ).toThrow('Unresolved composite reference "composite:nope" in block "e"');
  const a = composite('a', [], [{ id: 'ab', type: 'composite:b' }]);
  const b = composite('b', [], [{ id: 'ba', type: 'composite:a' }]);
  const cyc = new Map([
    ['a', a],
    ['b', b],
  ]);
  expect(() =>
    toJsx([{ id: 'root', type: 'composite:a' }], {
      components,
      resolveComposite: (id) => cyc.get(id) ?? null,
    }),
  ).toThrow('Composite cycle: a -> b -> a');
});
