/**
 * Range slider component with precise value selection and accessibility features
 *
 * @cognitive-load 3/10 - Value selection with immediate visual feedback
 * @attention-economics Value communication: visual track, precise labels, immediate feedback
 * @trust-building Immediate visual feedback, undo capability, clear value indication
 * @accessibility Keyboard increment/decrement, screen reader value announcements, touch-friendly handles
 * @semantic-meaning Range contexts: settings=configuration, filters=data selection, controls=media/volume
 *
 * @usage-patterns
 * DO: Show current value and units for clarity
 * DO: Use large thumb size for mobile and accessibility
 * DO: Provide visual markers for discrete value ranges
 * DO: Give immediate feedback with real-time updates
 * NEVER: Invisible ranges, unclear min/max values, tiny touch targets
 *
 * @example
 * ```html
 * <rafters-slider aria-label="Volume" default-value="50" max="100" step="1"></rafters-slider>
 * <rafters-slider aria-label="Price" default-value="25 75" step="5"></rafters-slider>
 * ```
 */

/**
 * <rafters-slider> -- the Web Component performance of the Slider score.
 *
 * Light DOM, not a shadow root: the hidden form inputs must be the host's own
 * descendants to reach an enclosing `<form>`, and `bindSlider` reads its config
 * back from the parts this element renders. The element renders the tree the
 * Astro and React performances render, from the host's attributes (`min`, `max`,
 * `step`, `orientation`, `disabled`, `variant`, `size`, `name`, `aria-label`,
 * `aria-labelledby`, and the `default-value` seed: numbers separated by spaces
 * or commas). It then hands the root to `bindSlider` on the microtask after
 * `connectedCallback` and runs its teardown on `disconnectedCallback`.
 */
import type { AriaAttrs, PartIds } from '../../lib/contract';
import {
  bindSlider,
  effectiveValues,
  percentFor,
  sliderBehavior,
  sliderFormValue,
  sliderThumbAria,
  type SliderConfig,
  type SliderPart,
  type SliderSize,
  type SliderVariant,
} from './slider.behavior';
import { sliderClasses } from './slider.classes';

const VARIANTS: ReadonlyArray<SliderVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];
const SIZES: ReadonlyArray<SliderSize> = ['sm', 'default', 'lg'];

let instanceCounter = 0;

function parseNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSeed(value: string | null): number[] | undefined {
  if (value === null) return undefined;
  const seed = value
    .split(/[\s,]+/)
    .filter((piece) => piece !== '')
    .map(Number)
    .filter((n) => Number.isFinite(n));
  return seed.length > 0 ? seed : undefined;
}

function applyAttrs(el: HTMLElement, attrs: AriaAttrs): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    el.setAttribute(name, String(value));
  }
}

function makePart(tag: string, name: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.setAttribute('data-part', name);
  el.className = className;
  return el;
}

export class RaftersSlider extends HTMLElement {
  private readonly instanceId = `rafters-slider-${++instanceCounter}`;
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    this.replaceChildren(this.buildRoot());
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindSlider(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private readConfig(): SliderConfig {
    const variant = this.getAttribute('variant');
    const size = this.getAttribute('size');
    const min = parseNumber(this.getAttribute('min'), 0);
    return {
      variant: VARIANTS.find((v) => v === variant) ?? 'default',
      size: SIZES.find((s) => s === size) ?? 'default',
      min,
      max: parseNumber(this.getAttribute('max'), 100),
      step: parseNumber(this.getAttribute('step'), 1),
      orientation: this.getAttribute('orientation') === 'vertical' ? 'vertical' : 'horizontal',
      defaultValue: parseSeed(this.getAttribute('default-value')) ?? [min],
      disabled: this.hasAttribute('disabled'),
      name: this.getAttribute('name') || undefined,
    };
  }

  private buildRoot(): HTMLElement {
    const config = this.readConfig();
    const state = sliderBehavior.initialState(config);
    const classes = sliderClasses(config, state);

    const ids = {} as PartIds<SliderPart>;
    for (const name of Object.keys(sliderBehavior.parts) as SliderPart[]) {
      ids[name] = `${this.instanceId}-${name}`;
    }
    const aria = sliderBehavior.aria(state, config, ids);

    const values = effectiveValues(state, config);
    const isHorizontal = config.orientation === 'horizontal';
    const rangeStart = values.length > 1 ? percentFor(Math.min(...values), config) : 0;
    const rangeEnd = percentFor(Math.max(...values), config);

    const root = makePart('div', 'root', classes.root);
    root.id = ids.root;
    root.setAttribute('data-step', String(config.step));
    if (config.name) root.setAttribute('data-name', config.name);
    applyAttrs(root, aria.root ?? {});

    const track = makePart('span', 'track', classes.track);
    track.id = ids.track;
    applyAttrs(track, aria.track ?? {});

    const range = makePart('span', 'range', classes.range);
    range.setAttribute(
      'style',
      isHorizontal
        ? `left:${rangeStart}%;right:${100 - rangeEnd}%;top:0;bottom:0`
        : `bottom:${rangeStart}%;top:${100 - rangeEnd}%;left:0;right:0`,
    );
    applyAttrs(range, aria.range ?? {});
    track.appendChild(range);
    root.appendChild(track);

    const ariaLabel = this.getAttribute('aria-label');
    const ariaLabelledby = this.getAttribute('aria-labelledby');
    for (const [index, value] of values.entries()) {
      const pct = percentFor(value, config);
      const thumb = makePart('span', 'thumb', classes.thumb);
      thumb.setAttribute('role', 'slider');
      thumb.setAttribute('data-index', String(index));
      thumb.setAttribute('data-value', String(value));
      thumb.setAttribute('tabindex', config.disabled ? '-1' : '0');
      if (ariaLabel !== null) thumb.setAttribute('aria-label', ariaLabel);
      if (ariaLabelledby !== null) thumb.setAttribute('aria-labelledby', ariaLabelledby);
      thumb.setAttribute(
        'style',
        isHorizontal
          ? `left:${pct}%;top:50%;transform:translate(-50%,-50%)`
          : `bottom:${pct}%;left:50%;transform:translate(-50%,50%)`,
      );
      applyAttrs(thumb, sliderThumbAria(String(value), state, config));
      root.appendChild(thumb);
    }

    for (const [index, input] of sliderFormValue(state, config).entries()) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.setAttribute('data-slider-input', '');
      hidden.setAttribute('data-index', String(index));
      hidden.name = input.name;
      hidden.value = input.value;
      root.appendChild(hidden);
    }

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-slider')) {
  customElements.define('rafters-slider', RaftersSlider);
}
