import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/resizable/resizable.element';
import {
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
  type ResizableDirection,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';
import { applyAria } from './conformance-suite';

interface ScenePanel {
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

interface Scene {
  direction?: ResizableDirection;
  panels: ScenePanel[];
  disabled?: boolean;
  withHandle?: boolean;
}

function configFor(scene: Scene): ResizableConfig {
  return {
    direction: scene.direction ?? 'horizontal',
    disabled: scene.disabled ?? false,
    panels: scene.panels.map((panel) => ({
      defaultSize: panel.defaultSize,
      minSize: panel.minSize ?? 0,
      maxSize: panel.maxSize ?? 100,
    })),
  };
}

/** The light-DOM group the author (or Astro) provides: panels interleaved
 *  with role=separator handles, the score's initial projection and flex
 *  geometry already applied, each handle carrying an accessible name. */
function buildRoot(config: ResizableConfig, withHandle: boolean): HTMLElement {
  const state = resizableBehavior.initialState(config);
  const classes = resizableClasses(config, state);
  const aria = resizableBehavior.aria(state, config, { root: '', panel: '', handle: '' });

  const root = document.createElement('div');
  root.dataset['part'] = 'root';
  root.id = 'wc-root';
  root.dataset['direction'] = config.direction;
  root.className = classes.root;
  if (aria.root) applyAria(root, aria.root);

  for (const [index, panel] of config.panels.entries()) {
    const panelEl = document.createElement('div');
    panelEl.dataset['part'] = 'panel';
    panelEl.dataset['index'] = String(index);
    panelEl.dataset['panelDefault'] = String(panel.defaultSize);
    panelEl.dataset['panelMin'] = String(panel.minSize);
    panelEl.dataset['panelMax'] = String(panel.maxSize);
    panelEl.className = classes.panel;
    panelEl.style.flexBasis = `${state.sizes[index]}%`;
    const text = document.createElement('p');
    text.textContent = `Panel ${index + 1}`;
    panelEl.appendChild(text);
    root.appendChild(panelEl);

    if (index < config.panels.length - 1) {
      const handle = document.createElement('div');
      handle.setAttribute('role', 'separator');
      handle.dataset['part'] = 'handle';
      handle.dataset['index'] = String(index);
      handle.dataset['value'] = String(index);
      if (config.disabled) handle.dataset['disabled'] = 'true';
      handle.tabIndex = config.disabled ? -1 : 0;
      handle.setAttribute('aria-label', 'Resize section');
      handle.className = classes.handle;
      applyAria(handle, resizableHandleAria(String(index), state, config));
      if (withHandle) {
        const grip = document.createElement('div');
        grip.className = classes.grip;
        handle.appendChild(grip);
      }
      root.appendChild(handle);
    }
  }

  return root;
}

async function mount(scene: Scene): Promise<HTMLElement> {
  document.body.innerHTML = '<main></main>';
  const main = document.body.querySelector('main') as HTMLElement;
  const host = document.createElement('rafters-resizable');
  host.appendChild(buildRoot(configFor(scene), scene.withHandle ?? false));
  main.appendChild(host);
  await Promise.resolve(); // the element binds one microtask after connecting
  return main;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['two panels horizontal', { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }],
  [
    'three panels with a grip',
    { withHandle: true, panels: [{ defaultSize: 25 }, { defaultSize: 50 }, { defaultSize: 25 }] },
  ],
  ['vertical split', { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] }],
  [
    'bounded panels',
    {
      panels: [
        { defaultSize: 30, minSize: 20, maxSize: 60 },
        { defaultSize: 70, minSize: 40, maxSize: 80 },
      ],
    },
  ],
  ['disabled', { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }],
];

for (const [name, scene] of scenes) {
  test(`rafters-resizable ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
