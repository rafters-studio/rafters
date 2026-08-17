/**
 * WC render adapter + the shared color picker conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides the real
 * container with its canvases, thumbs, inputs, and preview so the interaction
 * surface exists before JS. This adapter builds that markup with the score's
 * initial projection already applied, then lets RaftersColorPicker hand the
 * root to bindColorPicker.
 */
import { beforeAll } from 'vitest';
import {
  colorPickerBehavior,
  effectiveColor,
  barPosFromHue,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';
import { colorPickerClasses } from '../../../src/components/color-picker/color-picker.classes';
import { RaftersColorPicker } from '../../../src/components/color-picker/color-picker.element';
import type { RenderResult } from '../../harness/conformance';
import {
  configFor,
  runColorPickerConformance,
  type ColorPickerAdapter,
  type ColorPickerScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-color-picker')) {
    customElements.define('rafters-color-picker', RaftersColorPicker);
  }
});

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function buildRoot(config: ColorPickerConfig): HTMLElement {
  const state = colorPickerBehavior.initialState(config);
  const classes = colorPickerClasses(config, state);
  const aria = colorPickerBehavior.aria(state, config, {
    root: 'wc-root',
    area: 'wc-area',
    hue: 'wc-hue',
    preview: 'wc-preview',
  });
  const color = effectiveColor(state, config);
  const safeMaxChroma = Math.max(config.maxChroma, 1e-6);

  const root = document.createElement('div');
  root.dataset['part'] = 'root';
  root.id = 'wc-root';
  root.dataset['maxChroma'] = String(config.maxChroma);
  root.dataset['defaultL'] = String(color.l);
  root.dataset['defaultC'] = String(color.c);
  root.dataset['defaultH'] = String(color.h);
  root.className = classes.root;
  if (aria.root) applyAria(root, aria.root);

  // Area container
  const area = document.createElement('div');
  area.dataset['part'] = 'area';
  area.id = 'wc-area';
  area.className = classes.area;
  if (aria.area) applyAria(area, aria.area);

  const areaCanvas = document.createElement('canvas');
  areaCanvas.className = 'absolute inset-0 h-full w-full';
  area.appendChild(areaCanvas);

  const areaThumb = document.createElement('div');
  areaThumb.dataset['role'] = 'thumb';
  areaThumb.setAttribute('aria-hidden', 'true');
  areaThumb.className = classes.areaThumb;
  areaThumb.style.cssText = `left:${color.l * 100}%;top:${(1 - color.c / safeMaxChroma) * 100}%`;
  area.appendChild(areaThumb);
  root.appendChild(area);

  // Hue container
  const hue = document.createElement('div');
  hue.dataset['part'] = 'hue';
  hue.id = 'wc-hue';
  hue.className = classes.hue;
  if (aria.hue) applyAria(hue, aria.hue);

  const hueCanvas = document.createElement('canvas');
  hueCanvas.className = 'absolute inset-0 h-full w-full';
  hue.appendChild(hueCanvas);

  const hueThumb = document.createElement('div');
  hueThumb.dataset['role'] = 'thumb';
  hueThumb.setAttribute('aria-hidden', 'true');
  hueThumb.className = classes.hueThumb;
  hueThumb.style.cssText = `left:${barPosFromHue(color.h) * 100}%`;
  hue.appendChild(hueThumb);
  root.appendChild(hue);

  // Inputs container
  const inputsContainer = document.createElement('div');
  inputsContainer.className = classes.inputs;
  for (const channel of ['l', 'c', 'h'] as const) {
    const input = document.createElement('input');
    input.dataset['channel'] = channel;
    input.className = classes.input;
    input.disabled = config.disabled;
    inputsContainer.appendChild(input);
  }
  root.appendChild(inputsContainer);

  // Preview container
  const previewContainer = document.createElement('div');
  previewContainer.className = 'mt-3 flex items-center gap-2';

  const preview = document.createElement('div');
  preview.dataset['part'] = 'preview';
  preview.id = 'wc-preview';
  preview.className = classes.preview;
  if (aria.preview) applyAria(preview, aria.preview);
  previewContainer.appendChild(preview);

  const gamutLabel = document.createElement('span');
  gamutLabel.dataset['part'] = 'gamut-label';
  gamutLabel.className = classes.gamutLabel;
  gamutLabel.setAttribute('aria-hidden', 'true');
  previewContainer.appendChild(gamutLabel);
  root.appendChild(previewContainer);

  return root;
}

const wcAdapter: ColorPickerAdapter = {
  name: 'wc',
  async render(props: ColorPickerScenarioProps): Promise<RenderResult> {
    const config = configFor(props);
    const hostEl = document.createElement('rafters-color-picker');
    hostEl.appendChild(buildRoot(config));
    document.body.appendChild(hostEl);
    await Promise.resolve();

    const root = hostEl.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('wc adapter: no root');
    return {
      host: hostEl,
      root,
      cleanup: () => {
        hostEl.remove();
      },
    };
  },
};

runColorPickerConformance(wcAdapter);
