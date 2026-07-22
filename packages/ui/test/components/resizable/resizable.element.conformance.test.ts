/**
 * WC render adapter + the shared resizable conformance suite.
 *
 * The Web Component is a light-DOM enhancer: the author provides the real group
 * with its panel/handle children so the pointer surface and the role=separator
 * handles exist before JS. This adapter server-renders that markup with the
 * score's initial projection + flex geometry already applied -- what Astro emits
 * -- then lets RaftersResizable hand the root to bindResizable (the SAME
 * controller the React binding composes).
 */
import { beforeAll } from 'vitest';
import {
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';
import { RaftersResizable } from '../../../src/components/resizable/resizable.element';
import type { RenderResult } from '../../harness/conformance';
import {
  configFor,
  runResizableConformance,
  type ResizableAdapter,
  type ResizableScenarioProps,
} from './conformance-suite';

beforeAll(() => {
  if (!customElements.get('rafters-resizable')) {
    customElements.define('rafters-resizable', RaftersResizable);
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

function buildRoot(config: ResizableConfig, label: string, withHandle: boolean): HTMLElement {
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
    root.appendChild(panelEl);

    if (index < config.panels.length - 1) {
      const handle = document.createElement('div');
      handle.setAttribute('role', 'separator');
      handle.dataset['part'] = 'handle';
      handle.dataset['index'] = String(index);
      handle.dataset['value'] = String(index);
      if (config.disabled) handle.dataset['disabled'] = 'true';
      handle.tabIndex = config.disabled ? -1 : 0;
      handle.setAttribute('aria-label', label);
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

const wcAdapter: ResizableAdapter = {
  name: 'wc',
  async render(props: ResizableScenarioProps, label): Promise<RenderResult> {
    const config = configFor(props);
    const hostEl = document.createElement('rafters-resizable');
    hostEl.appendChild(buildRoot(config, label, props.withHandle ?? false));
    document.body.appendChild(hostEl);
    // connectedCallback defers the bind one microtask (upgrade order); wait for it.
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

runResizableConformance(wcAdapter);
