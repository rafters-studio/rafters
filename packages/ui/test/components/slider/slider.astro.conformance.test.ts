/**
 * Astro performance of the Slider score, driven end to end. AstroContainer
 * renders the SSR markup with the score's initial projection + thumb geometry
 * already applied, but does NOT run the <script>, so the test calls bindSlider
 * directly -- that IS the script's job -- then drives the same score the React
 * and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Slider from '../../../src/components/slider/slider.astro';
import { bindSlider } from '../../../src/components/slider/slider.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Slider, {
    props: { id: 's', 'aria-label': 'Volume', ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('div[data-part="root"]') as HTMLElement;
  bindSlider(root); // the <script> does this per instance on the real page
  return root;
}

function thumbs(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="thumb"]'));
}

describe('slider conformance [astro]', () => {
  it('single SSR: one role=slider thumb with aria-valuemin/max/now and orientation', async () => {
    const root = await mount({ defaultValue: [50] });
    expect(root.getAttribute('data-orientation')).toBe('horizontal');
    const [thumb] = thumbs(root);
    expect(thumb?.getAttribute('role')).toBe('slider');
    expect(thumb?.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb?.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('50');
    expect(thumb?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('range SSR: two thumbs seeded with their values', async () => {
    const root = await mount({ defaultValue: [25, 75] });
    const [low, high] = thumbs(root);
    expect(low?.getAttribute('aria-valuenow')).toBe('25');
    expect(high?.getAttribute('aria-valuenow')).toBe('75');
  });

  it('track and range are decorative (aria-hidden)', async () => {
    const root = await mount({ defaultValue: [50] });
    expect(root.querySelector('[data-part="track"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('[data-part="range"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('vertical SSR projects data-orientation and aria-orientation vertical', async () => {
    const root = await mount({ orientation: 'vertical', defaultValue: [40] });
    expect(root.getAttribute('data-orientation')).toBe('vertical');
    expect(thumbs(root)[0]?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('ArrowRight steps the value and Home/End reach the ends', async () => {
    const user = userEvent.setup();
    const root = await mount({ defaultValue: [50] });
    const [thumb] = thumbs(root);
    thumb?.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('51');
    await user.keyboard('{Home}');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('0');
    await user.keyboard('{End}');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('disabled SSR: thumbs leave the tab order and keys do not move', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true, defaultValue: [30] });
    expect(root.getAttribute('data-disabled')).toBe('true');
    const [thumb] = thumbs(root);
    expect(thumb?.getAttribute('tabindex')).toBe('-1');
    expect(thumb?.getAttribute('aria-disabled')).toBe('true');
    thumb?.focus();
    await user.keyboard('{ArrowRight}');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('30');
  });

  it('a named slider renders a hidden input per thumb', async () => {
    const root = await mount({ name: 'volume', defaultValue: [25, 75] });
    const inputs = root.querySelectorAll<HTMLInputElement>('input[data-slider-input]');
    expect(inputs.length).toBe(2);
    expect(inputs[0]?.name).toBe('volume');
    expect(Array.from(inputs).map((i) => i.value)).toEqual(['25', '75']);
  });
});
