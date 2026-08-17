/**
 * React render adapter + the shared color picker conformance suite.
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import {
  ColorPicker,
  type ColorPickerProps,
} from '../../../src/components/color-picker/color-picker';
import type { RenderResult } from '../../harness/conformance';
import {
  runColorPickerConformance,
  type ColorPickerAdapter,
  type ColorPickerScenarioProps,
} from './conformance-suite';

function toProps(props: ColorPickerScenarioProps): ColorPickerProps {
  return {
    defaultValue: props.defaultValue,
    maxChroma: props.maxChroma,
    disabled: props.disabled,
  };
}

const reactAdapter: ColorPickerAdapter = {
  name: 'react',
  render(props): RenderResult {
    const utils = render(<ColorPicker {...toProps(props)} />);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runColorPickerConformance(reactAdapter);
