import type * as React from 'react';
import { describe, expect, it } from 'vitest';
import { keyInputOf } from '../../src/hooks/key-input';

describe('keyInputOf', () => {
  it('projects the five contract fields from a React keyboard event', () => {
    const event = {
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: true,
      metaKey: false,
      // React surface the translator must not carry through
      repeat: true,
      preventDefault() {},
    } as unknown as React.KeyboardEvent;

    expect(keyInputOf(event)).toEqual({
      key: 'Enter',
      shiftKey: true,
      ctrlKey: false,
      altKey: true,
      metaKey: false,
    });
  });

  it('carries only the five KeyInput fields -- no event surface leaks', () => {
    const event = {
      key: 'a',
      shiftKey: false,
      ctrlKey: true,
      altKey: false,
      metaKey: true,
      currentTarget: null,
    } as unknown as React.KeyboardEvent;

    expect(Object.keys(keyInputOf(event)).sort()).toEqual([
      'altKey',
      'ctrlKey',
      'key',
      'metaKey',
      'shiftKey',
    ]);
  });
});
