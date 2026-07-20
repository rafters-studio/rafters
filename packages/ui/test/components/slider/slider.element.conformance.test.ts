/**
 * WC render adapter + the shared slider conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides the real
 * container with its track/range/thumb children so the pointer surface and the
 * role=slider thumbs exist before JS. This adapter server-renders that markup
 * with the score's initial projection + thumb geometry already applied -- what
 * Astro emits -- then lets RaftersSlider hand the root to bindSlider (the SAME
 * controller the React binding composes).
 */
import { beforeAll } from 'vitest';
import {
  effectiveValues,
  percentFor,
  sliderBehavior,
  sliderThumbAria,
  type SliderConfig,
} from '../../../src/components/slider/slider.behavior';
import { sliderClasses } from '../../../src/components/slider/slider.classes';
import { RaftersSlider } from '../../../src/components/slider/slider.element';
import type { RenderResult } from '../../harness/conformance';
import {
  configFor,
  runSliderConformance,
  type SliderAdapter,
  type SliderScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-slider')) customElements.define('rafters-slider', RaftersSlider);
});

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function buildRoot(config: SliderConfig, label: string): HTMLElement {
  const state = sliderBehavior.initialState(config);
  const classes = sliderClasses(config, state);
  const aria = sliderBehavior.aria(state, config, { root: '', track: '', range: '', thumb: '' });
  const values = effectiveValues(state, config);
  const isHorizontal = config.orientation === 'horizontal';

  const root = document.createElement('div');
  root.dataset['part'] = 'root';
  root.id = 'wc-root';
  root.dataset['step'] = String(config.step);
  root.className = classes.root;
  if (aria.root) applyAria(root, aria.root);

  const track = document.createElement('span');
  track.dataset['part'] = 'track';
  track.className = classes.track;
  if (aria.track) applyAria(track, aria.track);

  const range = document.createElement('span');
  range.dataset['part'] = 'range';
  range.className = classes.range;
  if (aria.range) applyAria(range, aria.range);
  track.appendChild(range);
  root.appendChild(track);

  for (const [index, value] of values.entries()) {
    const thumb = document.createElement('span');
    thumb.setAttribute('role', 'slider');
    thumb.dataset['part'] = 'thumb';
    thumb.dataset['index'] = String(index);
    thumb.dataset['value'] = String(value);
    thumb.tabIndex = config.disabled ? -1 : 0;
    thumb.setAttribute('aria-label', label);
    thumb.className = classes.thumb;
    const pct = percentFor(value, config);
    thumb.style.cssText = isHorizontal ? `left:${pct}%;top:50%` : `bottom:${pct}%;left:50%`;
    applyAria(thumb, sliderThumbAria(String(value), state, config));
    root.appendChild(thumb);
  }

  return root;
}

const wcAdapter: SliderAdapter = {
  name: 'wc',
  async render(props: SliderScenarioProps, label): Promise<RenderResult> {
    const config = configFor(props);
    const hostEl = document.createElement('rafters-slider');
    hostEl.appendChild(buildRoot(config, label));
    document.body.appendChild(hostEl);
    // connectedCallback defers the bind one microtask (upgrade order); wait for it.
    await Promise.resolve();

    const root = hostEl.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('wc adapter: no root');
    return {
      host: hostEl,
      root,
      cleanup: () => {
        hostEl.remove();
      },
    };
  },
};

runSliderConformance(wcAdapter);
