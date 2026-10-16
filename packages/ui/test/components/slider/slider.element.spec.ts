import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/slider/slider.element';
import {
  effectiveValues,
  percentFor,
  sliderBehavior,
  sliderThumbAria,
  type SliderConfig,
} from '../../../src/components/slider/slider.behavior';
import { sliderClasses } from '../../../src/components/slider/slider.classes';

const BASE: SliderConfig = {
  variant: 'default',
  size: 'default',
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
};

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve();
  const host = document.querySelector<HTMLElement>('rafters-slider');
  if (!host) throw new Error('rafters-slider did not mount');
  return host;
}

function parts(host: HTMLElement) {
  const root = host.querySelector<HTMLElement>('[data-part="root"]');
  const track = host.querySelector<HTMLElement>('[data-part="track"]');
  const range = host.querySelector<HTMLElement>('[data-part="range"]');
  if (!root || !track || !range) throw new Error('missing parts');
  const thumbs = Array.from(host.querySelectorAll<HTMLElement>('[data-part="thumb"]'));
  return { root, track, range, thumbs };
}

function expectAttrs(el: HTMLElement, attrs: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(attrs)) {
    expect(el.getAttribute(k)).toBe(v === undefined ? null : String(v));
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('rafters-slider parts', () => {
  it('upgrades and renders root, track, range and one thumb at 0 with no hidden input', async () => {
    const host = await mount('<rafters-slider aria-label="Volume"></rafters-slider>');
    const { root, thumbs } = parts(host);
    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]?.getAttribute('aria-valuenow')).toBe('0');
    expect(thumbs[0]?.getAttribute('aria-label')).toBe('Volume');
    expect(root.getAttribute('data-step')).toBe('1');
    expect(host.querySelector('input')).toBeNull();
  });

  const scenarios: ReadonlyArray<[string, string, Partial<SliderConfig>, boolean]> = [
    ['default', '', {}, false],
    ['min max step', 'min="10" max="50" step="5"', { min: 10, max: 50, step: 5 }, false],
    ['vertical', 'orientation="vertical"', { orientation: 'vertical' }, false],
    ['disabled', 'disabled', { disabled: true }, true],
    [
      'destructive lg',
      'variant="destructive" size="lg"',
      { variant: 'destructive', size: 'lg' },
      false,
    ],
  ];

  for (const [name, attrs, overrides, disabled] of scenarios) {
    it(`classes, aria and position match the score: ${name}`, async () => {
      const host = await mount(`<rafters-slider aria-label="Volume" ${attrs}></rafters-slider>`);
      const config: SliderConfig = { ...BASE, ...overrides };
      const state = sliderBehavior.initialState(config);
      const classes = sliderClasses(config, state);
      const { root, track, range, thumbs } = parts(host);
      const ids = { root: root.id, track: track.id, range: '', thumb: '' };
      const aria = sliderBehavior.aria(state, config, ids);
      expect(root.className).toBe(classes.root);
      expect(track.className).toBe(classes.track);
      expect(range.className).toBe(classes.range);
      expectAttrs(root, aria.root ?? {});
      expectAttrs(track, aria.track ?? {});
      expectAttrs(range, aria.range ?? {});
      const values = effectiveValues(state, config);
      expect(thumbs).toHaveLength(values.length);
      for (const [i, thumb] of thumbs.entries()) {
        const value = values[i] as number;
        expect(thumb.className).toBe(classes.thumb);
        expectAttrs(thumb, sliderThumbAria(String(value), state, config));
        expect(thumb.getAttribute('tabindex')).toBe(disabled ? '-1' : '0');
        const pct = percentFor(value, config);
        const side = config.orientation === 'vertical' ? 'bottom' : 'left';
        expect(thumb.style.getPropertyValue(side)).toBe(`${pct}%`);
      }
    });
  }

  it('falls back to defaults for values outside the enums', async () => {
    const host = await mount(
      '<rafters-slider aria-label="V" orientation="diagonal" variant="nope" size="huge" min="x"></rafters-slider>',
    );
    const config = BASE;
    const classes = sliderClasses(config, sliderBehavior.initialState(config));
    const { root, thumbs } = parts(host);
    expect(root.className).toBe(classes.root);
    expect(thumbs[0]?.className).toBe(classes.thumb);
    expect(thumbs[0]?.getAttribute('aria-valuemin')).toBe('0');
  });
});

describe('rafters-slider interaction', () => {
  it('keys move the value and each move delivers one input event', async () => {
    const host = await mount(
      '<rafters-slider aria-label="Volume" default-value="50"></rafters-slider>',
    );
    const { thumbs } = parts(host);
    const thumb = thumbs[0] as HTMLElement;
    let inputs = 0;
    host.addEventListener('input', () => inputs++);
    const user = userEvent.setup();
    thumb.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('51');
    expect(inputs).toBe(1);
    await user.keyboard('{ArrowLeft}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    expect(inputs).toBe(2);
    await user.keyboard('{PageUp}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('60');
    await user.keyboard('{Home}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('0');
    await user.keyboard('{End}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('100');
    expect(inputs).toBe(5);
  });

  it('pressing the track moves the nearest thumb and keeps a range sorted', async () => {
    const host = await mount(
      '<rafters-slider aria-label="R" default-value="20 80" style="display:block;width:200px"></rafters-slider>',
    );
    const { root, track, thumbs } = parts(host);
    root.style.width = '200px';
    root.style.height = '20px';
    const rect = root.getBoundingClientRect();
    const user = userEvent.setup();
    await user.pointer([
      { keys: '[MouseLeft>]', target: track, coords: { x: rect.left + 190, y: rect.top + 5 } },
      { keys: '[/MouseLeft]' },
    ]);
    const values = thumbs.map((t) => Number(t.getAttribute('aria-valuenow')));
    expect(values[1]).toBeGreaterThan(80);
    expect(values[0]).toBe(20);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(root.hasAttribute('data-dragging')).toBe(false);

    const low = thumbs[0] as HTMLElement;
    low.focus();
    await user.keyboard('{End}');
    const after = thumbs.map((t) => Number(t.getAttribute('aria-valuenow')));
    expect(after).toEqual([...after].sort((a, b) => a - b));
  });

  it('a disabled slider does not move and delivers no input event', async () => {
    const host = await mount(
      '<rafters-slider aria-label="V" disabled default-value="30"></rafters-slider>',
    );
    const { root, thumbs } = parts(host);
    const thumb = thumbs[0] as HTMLElement;
    expect(thumb.getAttribute('tabindex')).toBe('-1');
    let inputs = 0;
    host.addEventListener('input', () => inputs++);
    const user = userEvent.setup();
    thumb.focus();
    await user.keyboard('{ArrowRight}');
    const rect = root.getBoundingClientRect();
    await user.pointer([
      { keys: '[MouseLeft>]', target: root, coords: { x: rect.left + 5, y: rect.top + 2 } },
      { keys: '[/MouseLeft]' },
    ]);
    expect(thumb.getAttribute('aria-valuenow')).toBe('30');
    expect(inputs).toBe(0);
  });
});

describe('rafters-slider form association', () => {
  it('contributes one entry per thumb under name and follows moves', async () => {
    await mount(
      '<form><rafters-slider name="vol" aria-label="Volume" default-value="25 75"></rafters-slider></form>',
    );
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('vol')).toEqual(['25', '75']);
    const host = document.querySelector('rafters-slider') as HTMLElement;
    const thumb = parts(host).thumbs[0] as HTMLElement;
    thumb.focus();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(new FormData(form).getAll('vol')).toEqual(['26', '75']);
  });

  it('a disabled slider still contributes; without name it contributes nothing', async () => {
    await mount(
      '<form><rafters-slider name="vol" aria-label="V" disabled default-value="30"></rafters-slider></form>',
    );
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('vol')).toEqual(['30']);
    await mount('<form><rafters-slider aria-label="V" default-value="30"></rafters-slider></form>');
    expect(Array.from(new FormData(document.querySelector('form') as HTMLFormElement))).toEqual([]);
  });
});

describe('rafters-slider lifecycle', () => {
  it('re-adding leaves one set of parts and one input event per key', async () => {
    const host = await mount('<rafters-slider aria-label="V" default-value="50"></rafters-slider>');
    const parent = host.parentElement as HTMLElement;
    host.remove();
    parent.appendChild(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="root"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="thumb"]')).toHaveLength(1);
    let inputs = 0;
    host.addEventListener('input', () => inputs++);
    const thumb = parts(host).thumbs[0] as HTMLElement;
    thumb.focus();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(inputs).toBe(1);
    expect(thumb.getAttribute('aria-valuenow')).toBe('51');
  });
});
