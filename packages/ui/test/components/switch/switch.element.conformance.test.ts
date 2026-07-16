/**
 * WC render adapter + the shared switch conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * <button role="switch" data-part="root"> so native Enter/Space activation
 * survives. This adapter server-renders that markup with the score's initial
 * projection already applied -- exactly what Astro emits -- then lets
 * RaftersSwitch hand the root to bindSwitch (the SAME controller the React
 * binding composes). The accessible name is aria-label on the inner button
 * (light DOM, so it is expressible).
 */
import { beforeAll } from 'vitest';
import { switchBehavior, type SwitchConfig } from '../../../src/components/switch/switch.behavior';
import { switchClasses } from '../../../src/components/switch/switch.classes';
import { RaftersSwitch } from '../../../src/components/switch/switch.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runSwitchConformance,
  type SwitchAdapter,
  type SwitchScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-switch')) customElements.define('rafters-switch', RaftersSwitch);
});

function configFor(props: SwitchScenarioProps): SwitchConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
  };
}

/** Apply a resolved aria projection to an element (undefined = absent). */
function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

const wcAdapter: SwitchAdapter = {
  name: 'wc',
  async render(props, label): Promise<RenderResult> {
    const config = configFor(props);
    const state = switchBehavior.initialState(config);
    const ids = { root: 'wc-root', thumb: 'wc-thumb' };
    const aria = switchBehavior.aria(state, config, ids);
    const classes = switchClasses(config, state);

    const hostEl = document.createElement('rafters-switch');

    const root = document.createElement('button');
    root.type = 'button';
    root.setAttribute('role', 'switch');
    root.dataset['part'] = 'root';
    root.id = ids.root;
    root.className = classes.root;
    root.setAttribute('aria-label', label);
    if (props.disabled) root.disabled = true;
    if (aria.root) applyAria(root, aria.root);

    const thumb = document.createElement('span');
    thumb.dataset['part'] = 'thumb';
    thumb.id = ids.thumb;
    thumb.className = classes.thumb;
    if (aria.thumb) applyAria(thumb, aria.thumb);
    root.appendChild(thumb);

    hostEl.appendChild(root);
    document.body.appendChild(hostEl);
    // connectedCallback defers the bind one microtask (upgrade order); wait for it.
    await Promise.resolve();

    return {
      host: hostEl,
      root,
      cleanup: () => {
        hostEl.remove();
      },
    };
  },
};

runSwitchConformance(wcAdapter);
