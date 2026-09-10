/**
 * WC render + performance of the color-picker score, driven end to end.
 *
 * The Web Component is a light-DOM enhancer: the author provides the real
 * container with its canvases, thumbs, inputs, and preview so the interaction
 * surface exists before JS. This test builds that markup with the score's
 * initial projection already applied, then lets RaftersColorPicker hand the
 * root to bindColorPicker.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  colorPickerBehavior,
  effectiveColor,
  barPosFromHue,
  DEFAULT_MAX_CHROMA,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';
import { colorPickerClasses } from '../../../src/components/color-picker/color-picker.classes';
import { RaftersColorPicker } from '../../../src/components/color-picker/color-picker.element';

interface ScenarioProps {
  defaultValue?: { l: number; c: number; h: number };
  maxChroma?: number;
  disabled?: boolean;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'default', props: {} },
  { name: 'custom color', props: { defaultValue: { l: 0.3, c: 0.2, h: 90 } } },
  { name: 'high chroma range', props: { maxChroma: 0.5 } },
  { name: 'disabled', props: { disabled: true } },
];

const EXPECTED_PARTS = ['root', 'area', 'hue', 'preview'] as const;

function configFor(props: ScenarioProps): ColorPickerConfig {
  return {
    maxChroma: props.maxChroma ?? DEFAULT_MAX_CHROMA,
    disabled: props.disabled ?? false,
    defaultValue: props.defaultValue,
  };
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly string[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part renders (with its declared role), and the rendered
 *  ARIA equals the score's projection -- including absence: a projected
 *  `undefined` means the attribute must not render. */
function assertContractFulfillment(root: HTMLElement, scenario: ScenarioProps): void {
  const config = configFor(scenario);
  const state = colorPickerBehavior.initialState(config);
  const ids = domPartIds(root, EXPECTED_PARTS);
  const projection = colorPickerBehavior.aria(state, config, ids);

  for (const part of EXPECTED_PARTS) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = colorPickerBehavior.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
    const attrs = projection[part];
    if (!attrs) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
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

beforeAll(() => {
  if (!customElements.get('rafters-color-picker')) {
    customElements.define('rafters-color-picker', RaftersColorPicker);
  }
});

async function mount(props: ScenarioProps): Promise<HTMLElement> {
  const config = configFor(props);
  const hostEl = document.createElement('rafters-color-picker');
  hostEl.appendChild(buildRoot(config));
  document.body.appendChild(hostEl);
  await Promise.resolve();

  const root = hostEl.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('no root');
  return root;
}

describe('color-picker conformance [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const root = await mount(scenario.props);
      try {
        assertContractFulfillment(root, scenario.props);
      } finally {
        root.closest('rafters-color-picker')?.remove();
      }
    });

    it(`${scenario.name}: area and hue canvases are present`, async () => {
      const root = await mount(scenario.props);
      try {
        const area = partElement(root, 'area');
        expect(area?.querySelector('canvas')).not.toBeNull();
        const hue = partElement(root, 'hue');
        expect(hue?.querySelector('canvas')).not.toBeNull();
      } finally {
        root.closest('rafters-color-picker')?.remove();
      }
    });

    it(`${scenario.name}: three numeric inputs with data-channel`, async () => {
      const root = await mount(scenario.props);
      try {
        for (const channel of ['l', 'c', 'h']) {
          const input = root.querySelector(`[data-channel="${channel}"]`);
          expect(input, `input for channel ${channel}`).not.toBeNull();
        }
      } finally {
        root.closest('rafters-color-picker')?.remove();
      }
    });
  }
});
