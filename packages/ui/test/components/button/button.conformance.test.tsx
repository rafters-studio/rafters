/**
 * React render adapter + the shared button conformance suite.
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import { Button, type ButtonProps } from '../../../src/components/button/button';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

function toProps(props: ButtonScenarioProps): ButtonProps {
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
  return mapped as unknown as ButtonProps;
}

const reactAdapter: ButtonAdapter = {
  name: 'react',
  supportsIconLabel: true,
  render(props, label): RenderResult {
    const utils = render(<Button {...toProps(props)}>{label}</Button>);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runButtonConformance(reactAdapter);
