import { describe, expect, it } from 'vitest';
import { avatar, resolveAvatar } from '../../../src/components/avatar/avatar.behavior';

const state = {};
const ids = { root: 'r', image: 'i', fallback: 'f' };

describe('avatar parts', () => {
  it('declares root plus the optional image and fallback', () => {
    expect(Object.keys(avatar.parts)).toEqual(['root', 'image', 'fallback']);
  });

  it('marks image and fallback optional -- presence depends on status', () => {
    expect(avatar.parts.image.optional).toBe(true);
    expect(avatar.parts.fallback.optional).toBe(true);
  });
});

describe('avatar aria projection', () => {
  it('projects an EMPTY object per part -- semantics are native (like Card)', () => {
    const projection = avatar.aria(state, { size: 'md', status: 'loading' }, ids);
    expect(projection.root).toEqual({});
    expect(projection.image).toEqual({});
    expect(projection.fallback).toEqual({});
  });

  it('never projects a role or aria-* regardless of status', () => {
    for (const status of ['loading', 'loaded', 'error'] as const) {
      expect(avatar.aria(state, { status }, ids)).toEqual({
        root: {},
        image: {},
        fallback: {},
      });
    }
  });
});

describe('resolveAvatar -- the single presence computation', () => {
  it('defaults an empty config to md/loading with both parts present', () => {
    expect(resolveAvatar({})).toEqual({
      size: 'md',
      status: 'loading',
      imageHidden: false,
      fallbackHidden: false,
    });
  });

  it('loaded hides the fallback, keeps the image', () => {
    const r = resolveAvatar({ status: 'loaded' });
    expect(r.imageHidden).toBe(false);
    expect(r.fallbackHidden).toBe(true);
  });

  it('error hides the image, keeps the fallback', () => {
    const r = resolveAvatar({ status: 'error' });
    expect(r.imageHidden).toBe(true);
    expect(r.fallbackHidden).toBe(false);
  });

  it('resolves a known size and falls back to md for an unknown one', () => {
    expect(resolveAvatar({ size: 'xl' }).size).toBe('xl');
    expect(resolveAvatar({ size: 'mega' as never }).size).toBe('md');
  });

  it('falls back to loading for an unknown status', () => {
    expect(resolveAvatar({ status: 'bogus' as never }).status).toBe('loading');
  });
});

describe('avatar is a static score -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(avatar.actions)).toEqual([]);
  });

  it('never gates dispatch -- there is nothing to dispatch', () => {
    expect(avatar.canDispatch(state, 'anything' as never, {})).toBe(true);
  });

  it('claims no keys', () => {
    expect(avatar.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('has no effects -- nothing to perform, so nothing to bind', () => {
    expect(avatar.effects(state, {})).toEqual([]);
  });

  it('initial state is empty -- the datum is config, not state', () => {
    expect(avatar.initialState({})).toEqual({});
  });
});
