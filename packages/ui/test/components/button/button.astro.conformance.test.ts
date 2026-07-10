/**
 * Astro render adapter + the shared button conformance suite, static-tier
 * only (Spec 01 testing obligations; button.md "Astro ... interaction
 * tiers apply only where a client runtime exists, static tiers apply
 * always"). `supportsInteraction: false` drops the keyboard/click
 * assertions -- there is no dispatch loop here to feed them.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach } from 'vitest';
import Button from '../../../src/components/button/button.astro';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

afterEach(() => {
  document.body.innerHTML = '';
});

function toProps(props: ButtonScenarioProps): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    softDisabled: props.softDisabled,
    loading: props.loading,
    toggle: props.toggle,
    defaultPressed: props.pressed,
  };
  if (props.ariaLabel !== undefined) mapped['aria-label'] = props.ariaLabel;
  return mapped;
}

const astroAdapter: ButtonAdapter = {
  name: 'astro',
  supportsIconLabel: true,
  supportsInteraction: false,
  async render(props, label): Promise<RenderResult> {
    const astroContainer = await AstroContainer.create();
    const html = await astroContainer.renderToString(Button, {
      props: toProps(props),
      slots: { default: label },
    });
    document.body.innerHTML = html;
    const root = document.body.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('astro adapter: no [data-part="root"] rendered');
    return {
      host: document.body,
      root,
      cleanup: () => {
        document.body.innerHTML = '';
      },
    };
  },
};

runButtonConformance(astroAdapter);
