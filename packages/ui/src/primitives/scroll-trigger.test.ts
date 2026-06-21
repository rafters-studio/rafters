import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onScrollTrigger, toggleClassOnScroll } from './scroll-trigger';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;

  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(el: Element): void {
    this.observed = this.observed.filter((e) => e !== el);
  }
  disconnect(): void {
    this.disconnected = true;
  }

  /** Test helper: simulate the observed elements crossing the trigger line. */
  emit(isIntersecting: boolean): void {
    const entries = this.observed.map(
      (target) => ({ isIntersecting, target }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('onScrollTrigger', () => {
  it('fires the handler with the active state on each crossing', () => {
    const el = document.createElement('div');
    const handler = vi.fn();
    onScrollTrigger(el, handler);

    const io = MockIntersectionObserver.instances[0];
    expect(io.observed).toContain(el);

    io.emit(true);
    io.emit(false);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0][0]).toBe(true);
    expect(handler.mock.calls[1][0]).toBe(false);
  });

  it('passes root/rootMargin/threshold through to the observer', () => {
    const el = document.createElement('div');
    onScrollTrigger(el, () => {}, { rootMargin: '-64px 0px 0px 0px', threshold: [0, 1] });

    const io = MockIntersectionObserver.instances[0];
    expect(io.options?.rootMargin).toBe('-64px 0px 0px 0px');
    expect(io.options?.threshold).toEqual([0, 1]);
  });

  it('cleanup disconnects the observer', () => {
    const cleanup = onScrollTrigger(document.createElement('div'), () => {});
    const io = MockIntersectionObserver.instances[0];
    cleanup();
    expect(io.disconnected).toBe(true);
  });

  it('is a no-op when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const cleanup = onScrollTrigger(document.createElement('div'), () => {});
    expect(cleanup).toBeTypeOf('function');
    expect(() => cleanup()).not.toThrow();
  });
});

describe('toggleClassOnScroll', () => {
  it('switches the class on while in view and off when out (default)', () => {
    const el = document.createElement('div');
    toggleClassOnScroll(el, { className: 'is-visible' });

    const io = MockIntersectionObserver.instances[0];
    io.emit(true);
    expect(el.classList.contains('is-visible')).toBe(true);
    io.emit(false);
    expect(el.classList.contains('is-visible')).toBe(false);
  });

  it('inverts with whileInView:false -- pin a header once scrolled past a sentinel', () => {
    const sentinel = document.createElement('div');
    const header = document.createElement('header');
    toggleClassOnScroll(sentinel, { className: 'stuck', target: header, whileInView: false });

    const io = MockIntersectionObserver.instances[0];
    io.emit(true); // sentinel still visible -> not stuck
    expect(header.classList.contains('stuck')).toBe(false);
    io.emit(false); // scrolled past the sentinel -> stuck
    expect(header.classList.contains('stuck')).toBe(true);
  });
});
