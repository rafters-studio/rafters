import { afterEach, describe, expect, it } from 'vitest';
import './progress.element';
import {
  progressIndeterminateClasses,
  progressSizeClasses,
  progressVariantClasses,
} from './progress.classes';
import {
  composeProgressIndicatorClasses,
  composeProgressTrackClasses,
  RaftersProgress,
} from './progress.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-progress');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function track(el: Element): HTMLDivElement | null {
  return (el.shadowRoot?.firstElementChild as HTMLDivElement | null) ?? null;
}

function indicator(el: Element): HTMLDivElement | null {
  return (track(el)?.firstElementChild as HTMLDivElement | null) ?? null;
}

function trackClass(el: Element): string {
  return track(el)?.className ?? '';
}

function indicatorClass(el: Element): string {
  return indicator(el)?.className ?? '';
}

describe('<rafters-progress>', () => {
  it('registers the rafters-progress tag on import', () => {
    expect(customElements.get('rafters-progress')).toBe(RaftersProgress);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./progress.element')).resolves.toBeDefined();
    await expect(import('./progress.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-progress')).toBe(RaftersProgress);
  });

  it('renders a track div wrapping an indicator div', () => {
    const el = mount();
    const t = track(el);
    expect(t).not.toBeNull();
    expect(t?.getAttribute('role')).toBe('progressbar');
    const i = indicator(el);
    expect(i).not.toBeNull();
  });

  it('applies base + default variant + default size classes on the inner nodes', () => {
    const el = mount();
    expect(trackClass(el)).toBe(composeProgressTrackClasses('default'));
    // Default state is indeterminate, so the indicator carries the animation utility.
    expect(indicatorClass(el)).toBe(composeProgressIndicatorClasses('default', true));
  });

  it('falls back to default variant/size for unknown values', () => {
    const el = mount({ variant: 'nonsense', size: 'gigantic' });
    expect(trackClass(el)).toContain(progressSizeClasses.default);
    expect(indicatorClass(el)).toContain(progressVariantClasses.default);
  });

  it('reflects value changes to indicator inline width and aria-valuenow', () => {
    const el = mount();
    el.setAttribute('value', '33');
    const i = indicator(el);
    const t = track(el);
    expect(i?.style.width).toBe('33%');
    expect(t?.getAttribute('aria-valuenow')).toBe('33');
    expect(t?.getAttribute('aria-valuetext')).toBe('33%');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('falls back to indeterminate when value is absent or non-numeric', () => {
    const el = mount();
    expect(el.getAttribute('aria-busy')).toBe('true');
    const i = indicator(el);
    expect(i?.style.width).toBe('');
    expect(i?.hasAttribute('data-indeterminate')).toBe(true);
    expect(indicatorClass(el)).toContain(progressIndeterminateClasses);

    const el2 = mount({ value: 'not-a-number' });
    expect(el2.getAttribute('aria-busy')).toBe('true');
    const i2 = indicator(el2);
    expect(i2?.style.width).toBe('');
    expect(i2?.hasAttribute('data-indeterminate')).toBe(true);
    expect(indicatorClass(el2)).toContain(progressIndeterminateClasses);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'progress.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersProgress.observedAttributes).toEqual(['value', 'max', 'variant', 'size']);
  });

  it('emits aria-valuemin=0 and aria-valuemax=max on the track', () => {
    const el = mount({ max: '250', value: '50' });
    const t = track(el);
    expect(t?.getAttribute('aria-valuemin')).toBe('0');
    expect(t?.getAttribute('aria-valuemax')).toBe('250');
    expect(t?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('clamps value to [0, max]', () => {
    const el = mount({ value: '200', max: '100' });
    expect(indicator(el)?.style.width).toBe('100%');
    expect(track(el)?.getAttribute('aria-valuenow')).toBe('100');

    const el2 = mount({ value: '-50' });
    expect(indicator(el2)?.style.width).toBe('0%');
    expect(track(el2)?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('falls back to max=100 when max is non-numeric or non-positive', () => {
    const el = mount({ max: 'abc', value: '50' });
    expect(track(el)?.getAttribute('aria-valuemax')).toBe('100');

    const el2 = mount({ max: '0', value: '50' });
    expect(track(el2)?.getAttribute('aria-valuemax')).toBe('100');

    const el3 = mount({ max: '-10', value: '50' });
    expect(track(el3)?.getAttribute('aria-valuemax')).toBe('100');
  });

  it('reflects variant attribute changes to the indicator class string', () => {
    const el = mount({ value: '50' });
    el.setAttribute('variant', 'destructive');
    expect(indicatorClass(el)).toContain(progressVariantClasses.destructive);
  });

  it('reflects size attribute changes to the track class string', () => {
    const el = mount();
    el.setAttribute('size', 'lg');
    expect(trackClass(el)).toContain(progressSizeClasses.lg);
    el.setAttribute('size', 'sm');
    expect(trackClass(el)).toContain(progressSizeClasses.sm);
  });

  it('removes aria-busy and data-indeterminate when value becomes numeric', () => {
    const el = mount();
    expect(el.getAttribute('aria-busy')).toBe('true');
    el.setAttribute('value', '42');
    expect(el.hasAttribute('aria-busy')).toBe(false);
    const i = indicator(el);
    expect(i?.hasAttribute('data-indeterminate')).toBe(false);
    expect(i?.style.width).toBe('42%');
    expect(indicatorClass(el)).not.toContain(progressIndeterminateClasses);
  });

  it('re-enters indeterminate when value is removed', () => {
    const el = mount({ value: '50' });
    expect(el.hasAttribute('aria-busy')).toBe(false);
    el.removeAttribute('value');
    expect(el.getAttribute('aria-busy')).toBe('true');
    const i = indicator(el);
    expect(i?.hasAttribute('data-indeterminate')).toBe(true);
    expect(i?.style.width).toBe('');
    expect(indicatorClass(el)).toContain(progressIndeterminateClasses);
  });

  it('inner nodes carry the shared utility class strings, not a hand-written map', () => {
    const el = mount({ value: '60', variant: 'success', size: 'lg' });
    expect(trackClass(el)).toBe(composeProgressTrackClasses('lg'));
    expect(indicatorClass(el)).toBe(composeProgressIndicatorClasses('success', false));
  });
});
