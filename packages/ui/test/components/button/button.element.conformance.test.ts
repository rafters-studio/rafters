/**
 * Web Component render adapter + the shared button conformance suite.
 * The adapter queries inside the shadow root; the suite is unchanged --
 * that symmetry IS the cross-framework conformance claim.
 */
import '../../../src/components/button/button.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

const BOOLEAN_ATTRS: ReadonlyArray<[keyof ButtonScenarioProps, string]> = [
  ['disabled', 'disabled'],
  ['softDisabled', 'soft-disabled'],
  ['loading', 'loading'],
  ['toggle', 'toggle'],
  ['pressed', 'pressed'],
];

const wcAdapter: ButtonAdapter = {
  name: 'wc',
  supportsIconLabel: false,
  render(props, label): RenderResult {
    const host = document.createElement('rafters-button');
    if (props.variant) host.setAttribute('variant', props.variant);
    if (props.size) host.setAttribute('size', props.size);
    for (const [key, attr] of BOOLEAN_ATTRS) {
      if (props[key] === true) host.setAttribute(attr, '');
    }
    host.textContent = label;
    document.body.appendChild(host);
    const root = host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('wc adapter: no [data-part="root"] in shadow root');
    return { host, root, cleanup: () => host.remove() };
  },
};

runButtonConformance(wcAdapter);
