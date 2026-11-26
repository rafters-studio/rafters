// Unit: the one registry is made once, and a transaction leaves it as it found it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRegistry, transaction } from './default.ts';
import { state } from './support.ts';

test('the default registry is made once', () => {
  assert.equal(defaultRegistry(), defaultRegistry());
});

test('a transaction takes back every choice it made', () => {
  const before = state(defaultRegistry());
  transaction((r) => {
    r.set('primary', { family: 'silver-true-sky', position: '600' }, { reason: 'brand blue' });
    r.set(
      'primary',
      { family: 'silver-true-sky', position: '400' },
      { reason: 'lighter in dark', mode: 'dark' },
    );
    r.set('rafters-duration-normal', '300ms', { reason: 'calmer' });
    assert.notDeepEqual(state(r), before);
  });
  assert.deepEqual(state(defaultRegistry()), before);
});

test('a transaction takes back its choices when the test fails', () => {
  const before = state(defaultRegistry());
  assert.throws(
    () =>
      transaction((r) => {
        r.set('rafters-duration-fast', '200ms', { reason: 'calmer' });
        throw new Error('the test failed');
      }),
    /the test failed/,
  );
  assert.deepEqual(state(defaultRegistry()), before);
});
