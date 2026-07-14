/**
 * WC render adapter + the shared button conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * <button data-part="root"> so native Enter/Space activation survives. This
 * adapter server-renders that markup with the score's initial projection
 * already applied -- exactly what Astro emits -- then lets RaftersButton hand
 * the root to bindButton (the SAME controller the React binding composes).
 *
 * Because the WC is light DOM (not shadow), the icon-only accessible-name
 * pattern is expressible: aria-label on the inner button. supportsIconLabel
 * is therefore true.
 */
import { beforeAll } from 'vitest';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { buttonClasses } from '../../../src/components/button/button.classes';
import { RaftersButton } from '../../../src/components/button/button.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-button')) customElements.define('rafters-button', RaftersButton);
});

function configFor(props: ButtonScenarioProps): ButtonConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: props.toggle ?? false,
    disabled: props.disabled ?? false,
    softDisabled: props.softDisabled ?? false,
    loading: props.loading ?? false,
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

const wcAdapter: ButtonAdapter = {
  name: 'wc',
  supportsIconLabel: true,
  async render(props, label): Promise<RenderResult> {
    const config = configFor(props);
    const state = button.initialState(config);
    const ids = { root: 'wc-root', label: 'wc-label', spinner: 'wc-spinner' };
    const aria = button.aria(state, config, ids);
    const classes = buttonClasses(config, state);

    const hostEl = document.createElement('rafters-button');

    const root = document.createElement('button');
    root.type = 'button';
    root.dataset['part'] = 'root';
    root.id = ids.root;
    root.className = classes.root;
    if (props.disabled) root.disabled = true;
    if (props.ariaLabel !== undefined) root.setAttribute('aria-label', props.ariaLabel);
    if (aria.root) applyAria(root, aria.root);

    if (props.loading) {
      const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      spinner.dataset['part'] = 'spinner';
      spinner.id = ids.spinner;
      spinner.setAttribute('class', classes.spinner);
      if (aria.spinner) {
        for (const [name, value] of Object.entries(aria.spinner)) {
          if (value !== undefined) spinner.setAttribute(name, String(value));
        }
      }
      root.appendChild(spinner);
    }

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

runButtonConformance(wcAdapter);
