/**
 * Empty-id sentinel regression (Spec 01, ruled 2026-07-08): an initially-open
 * disclosure must not emit aria-controls="" before the content ref registers.
 */
import { describe, expect, it } from 'vitest';
import { disclosable } from '../../src/lib/disclosable.js';

describe('disclosable empty-id sentinel', () => {
  const slice = disclosable();

  it('open + registered content id: aria-controls references it', () => {
    const aria = slice.aria({ open: true }, {}, { trigger: 'uid-trigger', content: 'uid-content' });
    expect(aria.trigger?.['aria-controls']).toBe('uid-content');
  });

  it('open + empty content id (first paint): aria-controls is absent, never ""', () => {
    const aria = slice.aria({ open: true }, {}, { trigger: 'uid-trigger', content: '' });
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
  });

  it('closed: aria-controls is absent regardless of id', () => {
    const aria = slice.aria(
      { open: false },
      {},
      { trigger: 'uid-trigger', content: 'uid-content' },
    );
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
  });
});
