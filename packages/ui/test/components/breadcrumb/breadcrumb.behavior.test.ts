import { describe, expect, it } from 'vitest';
import {
  breadcrumb,
  wrapBreadcrumbIcons,
} from '../../../src/components/breadcrumb/breadcrumb.behavior';

const state = {};
const config = {};
const ids = { root: 'r', startIcon: 's', endIcon: 'e' };

describe('breadcrumb parts', () => {
  it('declares the nav landmark root plus two optional decorative icon parts', () => {
    expect(Object.keys(breadcrumb.parts)).toEqual(['root', 'startIcon', 'endIcon']);
    expect(breadcrumb.parts.root).toEqual({});
    expect(breadcrumb.parts.startIcon).toEqual({ optional: true });
    expect(breadcrumb.parts.endIcon).toEqual({ optional: true });
  });
});

describe('breadcrumb aria projection', () => {
  it('projects an EMPTY root -- the landmark, current page, and separators are native markup', () => {
    // The nav aria-label, the current-page aria-current, and the aria-hidden
    // separators live in each performance's markup, NOT in the score. Like
    // Card and Container, the score computes nothing.
    expect(breadcrumb.aria(state, config, ids).root).toEqual({});
  });
});

describe('breadcrumb is a pure static -- no client, no bind', () => {
  it('has no actions', () => {
    expect(Object.keys(breadcrumb.actions)).toEqual([]);
  });

  it('never gates dispatch (there is nothing to dispatch)', () => {
    expect(breadcrumb.canDispatch(state, 'anything' as never, config)).toBe(true);
  });

  it('claims no keys', () => {
    expect(breadcrumb.keymap({ key: 'Enter' }, state, 'root', config)).toBeNull();
  });

  it('initial state is empty -- a static score has nothing to remember', () => {
    expect(breadcrumb.initialState(config)).toEqual({});
  });
});

describe('breadcrumb icon parts', () => {
  it('projects aria-hidden="true" on each icon wrapper', () => {
    const aria = breadcrumb.aria(state, config, ids);
    expect(aria.startIcon).toEqual({ 'aria-hidden': 'true' });
    expect(aria.endIcon).toEqual({ 'aria-hidden': 'true' });
  });
});

describe('wrapBreadcrumbIcons', () => {
  function mountTrail(inner: string): HTMLElement {
    document.body.innerHTML = `<div>${inner}</div>`;
    return document.body.firstElementChild as HTMLElement;
  }

  it('wraps slotted children of a link and the current page, start first and end last', () => {
    const scope = mountTrail(
      '<a href="/"><svg slot="end-icon"></svg>Home<svg slot="start-icon"></svg></a>' +
        '<span role="link" aria-current="page"><svg slot="start-icon"></svg>Widget</span>',
    );
    wrapBreadcrumbIcons(scope);
    const link = scope.querySelector('a') as HTMLElement;
    expect([...link.children].map((el) => el.getAttribute('data-part'))).toEqual([
      'startIcon',
      'endIcon',
    ]);
    const start = link.querySelector('[data-part="startIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(start?.querySelector('svg')?.hasAttribute('slot')).toBe(false);
    expect(link.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-end',
    );
    const page = scope.querySelector('[aria-current="page"]') as HTMLElement;
    expect(page.querySelector('[data-part="startIcon"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(page.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('adds no wrapper without a slotted child, and is idempotent', () => {
    const bare = mountTrail('<a href="/">Home</a>');
    wrapBreadcrumbIcons(bare);
    expect(bare.querySelector('[data-part]')).toBeNull();
    const scope = mountTrail('<a href="/"><svg slot="start-icon"></svg>Home</a>');
    wrapBreadcrumbIcons(scope);
    wrapBreadcrumbIcons(scope);
    expect(scope.querySelectorAll('[data-part="startIcon"]').length).toBe(1);
  });
});
