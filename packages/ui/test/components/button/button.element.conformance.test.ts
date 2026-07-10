/**
 * WC render adapter + the shared button conformance suite (~10 lines,
 * test/harness/conformance.ts header). Importing button.element.ts
 * registers <rafters-button> idempotently (guarded internally).
 */
import { afterEach } from 'vitest';
import '../../../src/components/button/button.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

function renderButton(props: ButtonScenarioProps, label: string): RenderResult {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const element = document.createElement('rafters-button');
  if (props.variant) element.setAttribute('variant', props.variant);
  if (props.size) element.setAttribute('size', props.size);
  if (props.disabled) element.setAttribute('disabled', '');
  if (props.softDisabled) element.setAttribute('soft-disabled', '');
  if (props.loading) element.setAttribute('loading', '');
  if (props.toggle) element.setAttribute('toggle', '');
  if (props.pressed) element.setAttribute('default-pressed', '');
  if (props.ariaLabel) element.setAttribute('aria-label', props.ariaLabel);
  element.textContent = label;
  host.appendChild(element);
  const root = element.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('wc adapter: no [data-part="root"] rendered');
  return { host, root, cleanup: () => host.remove() };
}

const wcAdapter: ButtonAdapter = {
  name: 'wc',
  // Host aria-label does not cross the shadow boundary onto the inner
  // button -- same limitation, same opt-out shape as Container's
  // supportsAriaLabelForward.
  supportsIconLabel: false,
  render: renderButton,
};

afterEach(() => {
  document.body.replaceChildren();
});

runButtonConformance(wcAdapter);
