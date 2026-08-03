import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_LOADING_LABEL,
  image,
  readImageConfig,
  resolveImage,
} from '../../../src/components/image/image.behavior';

const state = {};
const ids = { root: '', frame: '', img: '', status: '', caption: '' } as const;

describe('image parts', () => {
  it('declares the figure root, the clipping frame, the img, and the optional overlay/caption', () => {
    expect(Object.keys(image.parts).sort()).toEqual(['caption', 'frame', 'img', 'root', 'status']);
  });

  it('the overlay and caption are optional parts', () => {
    expect(image.parts.status.optional).toBe(true);
    expect(image.parts.caption.optional).toBe(true);
  });
});

describe('resolveImage', () => {
  it('defaults to a clean loaded image with no overlay', () => {
    expect(resolveImage({})).toEqual({
      status: 'loaded',
      isLoading: false,
      isError: false,
      hasOverlay: false,
      role: undefined,
      message: '',
    });
  });

  it('loading: a polite status overlay with the default loading label', () => {
    const r = resolveImage({ status: 'loading' });
    expect(r.isLoading).toBe(true);
    expect(r.hasOverlay).toBe(true);
    expect(r.role).toBe('status');
    expect(r.message).toBe(DEFAULT_LOADING_LABEL);
  });

  it('error: an assertive alert overlay with the default error message', () => {
    const r = resolveImage({ status: 'error' });
    expect(r.isError).toBe(true);
    expect(r.hasOverlay).toBe(true);
    expect(r.role).toBe('alert');
    expect(r.message).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('a supplied errorMessage / loadingLabel overrides the defaults', () => {
    expect(resolveImage({ status: 'error', errorMessage: 'Image unavailable' }).message).toBe(
      'Image unavailable',
    );
    expect(resolveImage({ status: 'loading', loadingLabel: 'Fetching photo' }).message).toBe(
      'Fetching photo',
    );
  });
});

describe('image aria projection', () => {
  it('loaded: no aria-busy on the img, no role on the overlay', () => {
    const aria = image.aria(state, {}, ids);
    expect(aria.img).toEqual({ 'aria-busy': undefined });
    expect(aria.status).toEqual({ role: undefined });
    expect(aria.root).toEqual({});
    expect(aria.frame).toEqual({});
    expect(aria.caption).toEqual({});
  });

  it('loading: the img is aria-busy and the overlay is role="status"', () => {
    const aria = image.aria(state, { status: 'loading' }, ids);
    expect(aria.img?.['aria-busy']).toBe('true');
    expect(aria.status?.role).toBe('status');
  });

  it('error: the img is not busy and the overlay is role="alert"', () => {
    const aria = image.aria(state, { status: 'error' }, ids);
    expect(aria.img?.['aria-busy']).toBeUndefined();
    expect(aria.status?.role).toBe('alert');
  });
});

describe('image is a static score', () => {
  it('has no keymap', () => {
    expect(image.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('has no actions and initial state is empty', () => {
    expect(Object.keys(image.actions)).toEqual([]);
    expect(image.initialState({})).toEqual({});
  });
});

describe('readImageConfig', () => {
  function el(attrs: Record<string, string>): HTMLElement {
    const node = document.createElement('div');
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  it('reconstructs config from data-* attributes (the inverse of the markup)', () => {
    const config = readImageConfig(
      el({
        'data-size': 'md',
        'data-alignment': 'left',
        'data-radius': '2xl',
        'data-fill': 'muted',
        'data-status': 'error',
        'data-error-message': 'Broken',
        'data-loading-label': 'Wait',
      }),
    );
    expect(config).toEqual({
      size: 'md',
      alignment: 'left',
      radius: '2xl',
      fill: 'muted',
      status: 'error',
      errorMessage: 'Broken',
      loadingLabel: 'Wait',
    });
  });

  it('unknown enum values fall back to undefined (defaults resolve downstream)', () => {
    const config = readImageConfig(
      el({ 'data-size': 'gigantic', 'data-alignment': 'diagonal', 'data-status': 'huh' }),
    );
    expect(config.size).toBeUndefined();
    expect(config.alignment).toBeUndefined();
    expect(config.status).toBeUndefined();
    expect(resolveImage(config).status).toBe('loaded');
  });
});
