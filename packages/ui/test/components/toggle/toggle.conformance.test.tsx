/**
 * React render adapter + the shared toggle conformance suite.
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import { Toggle, type ToggleProps } from '../../../src/components/toggle/toggle';
import type { RenderResult } from '../../harness/conformance';
import {
  runToggleConformance,
  type ToggleAdapter,
  type ToggleScenarioProps,
} from './conformance-suite';

function toProps(props: ToggleScenarioProps): ToggleProps {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    defaultPressed: props.pressed,
  };
  if (props.ariaLabel !== undefined) mapped['aria-label'] = props.ariaLabel;
  return mapped as unknown as ToggleProps;
}

const reactAdapter: ToggleAdapter = {
  name: 'react',
  supportsIconLabel: true,
  render(props, label): RenderResult {
    const utils = render(<Toggle {...toProps(props)}>{label}</Toggle>);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runToggleConformance(reactAdapter);
