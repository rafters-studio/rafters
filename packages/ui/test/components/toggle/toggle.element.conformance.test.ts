/**
 * WC render adapter + the shared toggle conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * <button data-part="root"> so native Enter/Space activation survives. This
 * adapter server-renders that markup with the score's initial projection
 * already applied -- exactly what Astro emits -- then lets RaftersToggle hand
 * the root to bindToggle (the SAME controller the React binding composes).
 *
 * Because the WC is light DOM (not shadow), the icon-only accessible-name
 * pattern is expressible: aria-label on the inner button.
 */
import { beforeAll } from 'vitest';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';
import { toggleClasses } from '../../../src/components/toggle/toggle.classes';
import { RaftersToggle } from '../../../src/components/toggle/toggle.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runToggleConformance,
  type ToggleAdapter,
  type ToggleScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-toggle')) customElements.define('rafters-toggle', RaftersToggle);
});

function configFor(props: ToggleScenarioProps): ToggleConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: true,
    disabled: props.disabled ?? false,
    defaultPressed: props.pressed ?? false,
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

const wcAdapter: ToggleAdapter = {
  name: 'wc',
  supportsIconLabel: true,
  async render(props, label): Promise<RenderResult> {
    const config = configFor(props);
    const state = toggle.initialState(config);
    const ids = { root: 'wc-root', label: 'wc-label', spinner: 'wc-spinner' };
    const aria = toggle.aria(state, config, ids);
    const classes = toggleClasses(config, state);

    const hostEl = document.createElement('rafters-toggle');

    const root = document.createElement('button');
    root.type = 'button';
    root.dataset['part'] = 'root';
    root.id = ids.root;
    root.className = classes.root;
    if (props.disabled) root.disabled = true;
    if (props.ariaLabel !== undefined) root.setAttribute('aria-label', props.ariaLabel);
    if (aria.root) applyAria(root, aria.root);

    const labelEl = document.createElement('span');
    labelEl.dataset['part'] = 'label';
    labelEl.id = ids.label;
    labelEl.textContent = label;
    root.appendChild(labelEl);

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

runToggleConformance(wcAdapter);
