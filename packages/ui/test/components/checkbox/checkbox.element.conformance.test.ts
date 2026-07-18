/**
 * WC render adapter + the shared checkbox conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * `<button data-part="root" role="checkbox">` so native Enter/Space activation
 * survives, plus a sibling hidden input for form association. This adapter
 * server-renders that markup with the score's initial projection already
 * applied -- exactly what Astro emits -- then lets RaftersCheckbox hand the root
 * to bindCheckbox (the SAME controller React composes).
 */
import { beforeAll } from 'vitest';
import { checkbox, type CheckboxConfig } from '../../../src/components/checkbox/checkbox.behavior';
import { checkboxClasses } from '../../../src/components/checkbox/checkbox.classes';
import { RaftersCheckbox } from '../../../src/components/checkbox/checkbox.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runCheckboxConformance,
  type CheckboxAdapter,
  type CheckboxScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-checkbox')) {
    customElements.define('rafters-checkbox', RaftersCheckbox);
  }
});

function configFor(props: CheckboxScenarioProps): CheckboxConfig {
  return {
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
  };
}

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function glyph(className: string, d: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

const wcAdapter: CheckboxAdapter = {
  name: 'wc',
  async render(props, label): Promise<RenderResult> {
    const config = configFor(props);
    const state = checkbox.initialState(config);
    const ids = { root: 'wc-root' };
    const aria = checkbox.aria(state, config, ids);
    const classes = checkboxClasses(config, state);

    const host = document.createElement('rafters-checkbox');

    const root = document.createElement('button');
    root.type = 'button';
    root.dataset['part'] = 'root';
    root.id = ids.root;
    root.className = classes.root;
    if (props.disabled) root.disabled = true;
    root.setAttribute('aria-label', label);
    if (aria.root) applyAria(root, aria.root);
    root.appendChild(glyph(classes.check, 'M5 13l4 4L19 7'));
    root.appendChild(glyph(classes.dash, 'M5 12h14'));

    host.appendChild(root);
    document.body.appendChild(host);
    // connectedCallback defers the bind one microtask (upgrade order); wait for it.
    await Promise.resolve();

    return {
      host,
      root,
      cleanup: () => {
        host.remove();
      },
    };
  },
};

runCheckboxConformance(wcAdapter);
