/**
 * Astro render adapter + the shared resizable conformance suite. AstroContainer
 * renders the SSR markup with the score's initial projection + flex geometry
 * already applied, but does NOT run the <script>, so the adapter calls
 * bindResizable directly -- that IS the script's job -- then drives the same
 * score the React and WC performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach } from 'vitest';
import Resizable from '../../../src/components/resizable/resizable.astro';
import { bindResizable } from '../../../src/components/resizable/resizable.behavior';
import type { RenderResult } from '../../harness/conformance';
import {
  runResizableConformance,
  type ResizableAdapter,
  type ResizableScenarioProps,
} from './conformance-suite';

afterEach(() => {
  document.body.innerHTML = '';
});

const astroAdapter: ResizableAdapter = {
  name: 'astro',
  async render(props: ResizableScenarioProps, label): Promise<RenderResult> {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Resizable, {
      props: {
        id: 'r',
        direction: props.direction,
        panels: props.panels,
        withHandle: props.withHandle,
        disabled: props.disabled,
        handleLabel: label,
      },
    });
    // Scope the host to a wrapper (like the React/WC adapters) rather than
    // document.body, so axe's page-level `region` landmark rule -- irrelevant to
    // a resizable fragment -- does not fire on the detached SSR markup.
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    const root = wrapper.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('astro adapter: no root');
    bindResizable(root); // the <script> does this per instance on the real page
    return {
      host: wrapper,
      root,
      cleanup: () => {
        wrapper.remove();
      },
    };
  },
};

runResizableConformance(astroAdapter);
