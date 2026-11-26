// Unit: the pure logic beneath the feature: the rules, each called with a fixed set of
// tokens, and the registry's own mechanics that no designer sees.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compose } from '../rules/compose.ts';
import { join } from '../rules/join.ts';
import { media } from '../rules/media.ts';
import { multiply } from '../rules/multiply.ts';
import { progression } from '../rules/progression.ts';
import { type Ctx, Registry, type Seed } from '../src/registry.ts';
import { made, refused, rules, runs } from './support.ts';

const tokens: Record<string, unknown> = {
  'spacing-base': '0.25rem',
  'font-size-base': '1rem',
  'minor-third': { a: 6, b: 5 },
  'breakpoint-md': '768px',
  'duration-fast': '150ms',
  'ease-enter': 'cubic-bezier(0, 0, 0.2, 1)',
  'font-heading': 'Inter',
  'font-size-5xl': '3rem',
};
const ctx: Ctx = { get: (n) => tokens[n], mode: 'light', name: 'test' };

test('multiply keeps the unit', () => {
  assert.equal(multiply({ of: 'spacing-base', by: 4 }, ctx), '1rem');
  assert.equal(multiply({ of: 'spacing-base', by: 0.5 }, ctx), '0.125rem');
});

test('multiply refuses a value that is not a length', () => {
  assert.throws(() => multiply({ of: 'ease-enter', by: 2 }, ctx), /not a length/);
});

test('progression steps up and down the ratio', () => {
  assert.equal(
    progression({ base: 'font-size-base', ratio: 'minor-third', step: 2 }, ctx),
    '1.44rem',
  );
  assert.equal(
    progression({ base: 'font-size-base', ratio: 'minor-third', step: -2 }, ctx),
    '0.694rem',
  );
});

test('media wraps a breakpoint', () => {
  assert.equal(media({ of: 'breakpoint-md' }, ctx), '(min-width: 768px)');
});

test('join and compose carry what they read', () => {
  assert.equal(
    join({ of: ['duration-fast', 'ease-enter'] }, ctx),
    '150ms cubic-bezier(0, 0, 0.2, 1)',
  );
  assert.deepEqual(compose({ fontFamily: 'font-heading', fontSize: 'font-size-5xl' }, ctx), {
    fontFamily: 'Inter',
    fontSize: '3rem',
  });
});

const base: Seed[] = [
  { name: 'spacing-base', value: '0.25rem' },
  made('spacing-4', 'multiply', { of: 'spacing-base', by: 4 }),
];

test('get returns a token with its value and the rule that made it', () => {
  const t = new Registry(base, rules).get('spacing-4');
  assert.equal(t?.value, '1rem');
  assert.deepEqual(t?.rule, { name: 'multiply', args: { of: 'spacing-base', by: 4 } });
});

test('a token made from two changed tokens is made once per mode, after both', () => {
  const r = new Registry(
    [
      ...base,
      made('radius-base', 'multiply', { of: 'spacing-base', by: 1.5 }),
      made('card-inset', 'add', { of: ['spacing-4', 'radius-base'] }),
    ],
    rules,
  );
  runs.add = 0;
  r.set('spacing-base', '0.5rem', { reason: 'denser layouts' });
  assert.equal(runs.add, 2, 'once in each mode');
  assert.equal(r.get('card-inset')?.value, '2.75rem');
});

test('what a rule reads is what the token depends on', () => {
  const r = new Registry(
    [...base, { name: 'dense', value: 'no' }, made('gap', 'when-dense', {})],
    rules,
  );
  assert.deepEqual(r.reads('gap'), ['dense@light']);
  r.set('dense', 'yes', { reason: 'compact view' });
  assert.deepEqual([...r.reads('gap')].sort(), ['dense@light', 'spacing-4@light']);
});

test('a rule cannot depend on itself', () => {
  assert.throws(
    () =>
      new Registry(
        [
          made('spacing-base', 'multiply', { of: 'spacing-4', by: 0.25 }),
          made('spacing-4', 'multiply', { of: 'spacing-base', by: 4 }),
        ],
        rules,
      ),
    refused('cycle'),
  );
});
