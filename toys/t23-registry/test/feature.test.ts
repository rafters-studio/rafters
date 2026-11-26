// BDD: one test per scenario in registry.feature, in its order and wording.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Registry, type Seed } from '../src/registry.ts';
import { made, makers, refused, rules, state } from './support.ts';

const background: Seed[] = [
  { name: 'spacing-base', value: '0.25rem' },
  made('spacing-4', 'multiply', { of: 'spacing-base', by: 4 }),
  made('card-padding', 'multiply', { of: 'spacing-4', by: 1.5 }),
];
const value = (r: Registry, name: string, mode?: string) => r.get(name, mode)?.value;

test('A designer changes a base, and everything made from it follows, in each mode', () => {
  const seeds: Seed[] = [
    ...background,
    { name: 'border-width', value: '0.0625rem' },
    made('ring', 'add', { of: ['spacing-4', 'border-width'] }),
    { name: 'font-size-base', value: '1rem' },
    { name: 'minor-third', value: { a: 6, b: 5 } },
    made('font-size-xl', 'progression', { base: 'font-size-base', ratio: 'minor-third', step: 2 }),
  ];
  const r = new Registry(seeds, rules);

  r.set('spacing-base', '0.5rem', { reason: 'denser layouts' });
  for (const mode of ['light', 'dark']) {
    assert.equal(value(r, 'spacing-4', mode), '2rem');
    assert.equal(value(r, 'card-padding', mode), '3rem');
  }

  const ring = { light: value(r, 'ring', 'light'), dark: value(r, 'ring', 'dark') };
  r.set('spacing-base', '0.375rem', { reason: 'dark reads larger', mode: 'dark' });
  assert.equal(value(r, 'spacing-base', 'light'), '0.5rem');
  assert.equal(value(r, 'ring', 'light'), ring.light);
  assert.notEqual(value(r, 'ring', 'dark'), ring.dark);

  r.set('font-size-base', '1.25rem', { reason: 'larger body' });
  assert.equal(value(r, 'font-size-xl'), '1.8rem');

  const saved = JSON.parse(JSON.stringify(r.choices()));
  assert.deepEqual(state(new Registry(seeds, rules, { choices: saved })), state(r));
  assert.equal(
    saved.length,
    new Set(saved.map((c: { name: string; mode?: string }) => `${c.name}@${c.mode ?? 'light'}`))
      .size,
  );
});

test('A designer makes a choice, changes their mind, and takes it back', () => {
  const r = new Registry(background, rules);
  r.set('spacing-4', '1.2rem', { reason: 'optical fix for the card' });
  r.set('spacing-base', '0.5rem', { reason: 'denser layouts' });
  assert.equal(value(r, 'spacing-4'), '1.2rem');
  assert.equal(value(r, 'card-padding'), '1.8rem');

  r.set('spacing-4', '1.1rem', { reason: 'a touch tighter' });
  assert.equal(r.get('spacing-4')?.reason, 'a touch tighter');
  assert.deepEqual(
    r
      .choices()
      .filter((c) => c.name === 'spacing-4')
      .map((c) => c.reason),
    ['a touch tighter'],
  );

  r.set('spacing-4');
  assert.equal(value(r, 'spacing-4'), '2rem');
  assert.equal(r.get('spacing-4')?.reason, undefined);
});

test('A designer adds a brand colour, a font and a fill, and can remove them', () => {
  const r = new Registry(background, rules, { makers });
  assert.throws(() => r.set('spacing-99', '9rem', { reason: 'why not' }), refused('unknown-token'));

  r.set('font-display', 'Fraunces', { reason: 'editorial headings' });
  r.set('brand', 'oklch(0.6 0.15 140)', { reason: 'brand green' });
  r.set('fill-brand', { of: 'brand' }, { reason: 'hero panels' });
  assert.equal(r.get('font-display')?.reason, 'editorial headings');
  assert.equal(r.get('brand')?.reason, 'brand green');
  assert.equal(r.get('fill-brand')?.reason, 'hero panels');
  assert.equal(value(r, 'brand-500'), 'oklch(0.6 0.15 140) at 500');

  r.set('brand', 'oklch(0.5 0.15 30)', { reason: 'warmer' });
  assert.equal(value(r, 'brand-500'), 'oklch(0.5 0.15 30) at 500');
  assert.equal(value(r, 'fill-brand'), 'oklch(0.5 0.15 30)');

  assert.throws(() => r.set('brand'), refused('in-use', 'fill-brand'));
  r.set('fill-brand');
  r.set('brand');
  assert.equal(r.has('fill-brand') || r.has('brand') || r.has('brand-500'), false);
});

test('A project starts from its intent, and a new intent starts it over', () => {
  const intent = (achromatic: string): Seed[] => [
    { name: 'achromatic', value: achromatic },
    made('neutral', 'copy', { of: 'achromatic' }),
  ];
  const first = new Registry(intent('zinc'), rules);
  assert.equal(value(first, 'neutral'), 'zinc');
  assert.equal(first.get('neutral')?.reason, undefined);

  first.set('neutral', 'slate', { reason: 'warmer grey' });
  const next = new Registry(intent('stone'), rules);
  assert.equal(value(next, 'neutral'), 'stone');
  assert.equal(next.get('neutral')?.reason, undefined);
});

test('Someone who asks for reduced motion sees no movement, and no designer can override it', () => {
  const r = new Registry(
    [
      {
        name: 'rafters-duration-fast',
        axis: 'motion',
        value: '150ms',
        modes: { reduced: { value: '0ms' } },
      },
      { name: 'rafters-ease-enter', axis: 'motion', value: 'cubic-bezier(0, 0, 0.2, 1)' },
      { name: 'rafters-period-spin', axis: 'motion', value: '1s' },
      {
        name: 'fade-in',
        axis: 'motion',
        rule: 'cell',
        args: { keyframe: 'fade-in', duration: { kind: 'tier', tier: 'fast' }, curve: 'enter' },
      },
      {
        name: 'spin',
        axis: 'motion',
        rule: 'cell',
        args: { keyframe: 'spin', duration: { kind: 'period', period: 'spin' } },
      },
    ],
    rules,
    { axes: { scheme: ['light', 'dark'], motion: ['full', 'reduced'] }, law: ['reduced'] },
  );
  const lasts = (n: string, m: string) => (r.get(n, m)?.value as { duration: string }).duration;

  assert.equal(lasts('fade-in', 'reduced'), '0ms');
  assert.equal(lasts('spin', 'reduced'), '1s');

  r.set('rafters-duration-fast', '200ms', { reason: 'calmer' });
  assert.equal(lasts('fade-in', 'full'), '200ms');
  assert.equal(lasts('fade-in', 'reduced'), '0ms');

  assert.throws(
    () => r.set('rafters-duration-fast', '50ms', { reason: 'keep a little', mode: 'reduced' }),
    refused('law'),
  );
});

test('A bad change is refused, and nothing moves', () => {
  const r = new Registry(
    [
      background[0] as Seed,
      made('spacing-4', 'nonzero', { of: 'spacing-base' }),
      background[2] as Seed,
    ],
    rules,
  );
  const before = state(r);

  assert.throws(() => r.set('spacing-base', '0.5rem', { reason: '' }), refused('no-reason'));
  assert.deepEqual(state(r), before);

  assert.throws(
    () => r.set('spacing-base', '0rem', { reason: 'test' }),
    refused('rule-failed', 'a zero base makes no scale'),
  );
  assert.deepEqual(state(r), before);
});
