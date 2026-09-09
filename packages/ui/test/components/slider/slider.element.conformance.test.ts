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
import { RaftersSlider } from '../../../src/components/slider/slider.element';
import type { RenderResult } from '../../harness/conformance';
import {
  buildRoot,
  configFor,
  runSliderConformance,
  type SliderAdapter,
  type SliderScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-slider')) customElements.define('rafters-slider', RaftersSlider);
});

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
