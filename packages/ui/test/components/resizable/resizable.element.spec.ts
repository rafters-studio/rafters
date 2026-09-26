/**
 * WC performance of the resizable score. The Web Component is a light-DOM
 * enhancer: the author provides the real group with its panel/handle children
 * so the pointer surface and the role=separator handles exist before JS. This
 * builds that markup with the score's initial projection + flex geometry
 * already applied -- what Astro emits -- then lets RaftersResizable hand the
 * root to bindResizable (the SAME controller the React controller composes),
 * and exercises every scenario in SCENARIOS.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
  type ResizableDirection,
  type ResizablePart,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';
import { RaftersResizable } from '../../../src/components/resizable/resizable.element';

interface ScenarioPanel {
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

interface ResizableScenarioProps {
  direction?: ResizableDirection;
  panels: ScenarioPanel[];
  disabled?: boolean;
  withHandle?: boolean;
}

interface Scenario {
  name: string;
  props: ResizableScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'two panels horizontal', props: { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] } },
  {
    name: 'three panels with a grip',
    props: {
      withHandle: true,
      panels: [{ defaultSize: 25 }, { defaultSize: 50 }, { defaultSize: 25 }],
    },
  },
  {
    name: 'vertical split',
    props: { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] },
  },
  {
    name: 'bounded panels',
    props: {
      panels: [
        { defaultSize: 30, minSize: 20, maxSize: 60 },
        { defaultSize: 70, minSize: 40, maxSize: 80 },
      ],
    },
  },
  {
    name: 'disabled',
    props: { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
  },
];

const EXPECTED_PARTS: readonly ResizablePart[] = ['root', 'panel', 'handle'];

function configFor(props: ResizableScenarioProps): ResizableConfig {
  const share = props.panels.length > 0 ? 100 / props.panels.length : 100;
  return {
    direction: props.direction ?? 'horizontal',
    disabled: props.disabled ?? false,
    panels: props.panels.map((panel) => ({
      defaultSize: panel.defaultSize ?? share,
      minSize: panel.minSize ?? 0,
      maxSize: panel.maxSize ?? 100,
    })),
  };
}

/** Applies an ARIA attribute map to an element, skipping attributes whose
 *  projected value is undefined (behavior-conditional ARIA, e.g. aria-disabled
 *  only when disabled). */
function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function partElements(root: HTMLElement, part: string): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
  if (root.getAttribute('data-part') === part) all.unshift(root);
  return all;
}

/** Every expected part present (with its declared role), and the rendered
 *  ARIA equals the score's projection -- including absence. */
function assertContractFulfillment(
  root: HTMLElement,
  state: ReturnType<typeof resizableBehavior.initialState>,
  config: ResizableConfig,
  expectedParts: readonly ResizablePart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = resizableBehavior.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }
  const allParts = Object.keys(resizableBehavior.parts) as ResizablePart[];
  const ids = {} as Record<ResizablePart, string>;
  for (const part of allParts) ids[part] = partElement(root, part)?.id ?? '';
  const projection = resizableBehavior.aria(state, config, ids);
  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/** Every rendered `handle` instance's ARIA equals `resizableBehavior.instanceAria`,
 *  sibling ids resolved from the DOM (behaviors never generate ids). */
function assertInstanceAriaFulfillment(
  root: HTMLElement,
  state: ReturnType<typeof resizableBehavior.initialState>,
  config: ResizableConfig,
): void {
  const project = resizableBehavior.instanceAria;
  if (!project) return;
  const manyParts = (Object.keys(resizableBehavior.parts) as ResizablePart[]).filter(
    (part) => resizableBehavior.parts[part].many,
  );
  for (const part of manyParts) {
    for (const element of partElements(root, part)) {
      const value = element.dataset['value'];
      if (value === undefined) continue;
      const ids: Partial<Record<ResizablePart, string>> = {};
      for (const sibling of manyParts) {
        ids[sibling] =
          root.querySelector<HTMLElement>(`[data-part="${sibling}"][data-value="${value}"]`)?.id ??
          '';
      }
      for (const [attr, projected] of Object.entries(project(part, value, state, config, ids))) {
        if (projected === undefined) {
          expect(element.hasAttribute(attr), `instance "${value}" of "${part}" ${attr}`).toBe(
            false,
          );
        } else {
          expect(element.getAttribute(attr), `instance "${value}" of "${part}" ${attr}`).toBe(
            String(projected),
          );
        }
      }
    }
  }
}

beforeAll(() => {
  if (!customElements.get('rafters-resizable')) {
    customElements.define('rafters-resizable', RaftersResizable);
  }
});

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

interface RenderResult {
  root: HTMLElement;
  cleanup: () => void;
}

async function renderScenario(props: ResizableScenarioProps, label: string): Promise<RenderResult> {
  const config = configFor(props);
  const hostEl = document.createElement('rafters-resizable');
  hostEl.appendChild(buildRoot(config, label, props.withHandle ?? false));
  document.body.appendChild(hostEl);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();

  const root = hostEl.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('wc: no root');
  return {
    root,
    cleanup: () => {
      hostEl.remove();
    },
  };
}

describe('resizable [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const { root, cleanup } = await renderScenario(scenario.props, 'Resize section');
      try {
        const config = configFor(scenario.props);
        const state = resizableBehavior.initialState(config);
        assertContractFulfillment(root, state, config, EXPECTED_PARTS);
        assertInstanceAriaFulfillment(root, state, config);
      } finally {
        cleanup();
      }
    });

    it(`${scenario.name}: one fewer separator than panels, each role=separator`, async () => {
      const { root, cleanup } = await renderScenario(scenario.props, 'Resize section');
      try {
        const panels = partElements(root, 'panel');
        const handles = partElements(root, 'handle');
        expect(panels.length).toBe(scenario.props.panels.length);
        expect(handles.length).toBe(scenario.props.panels.length - 1);
        for (const handle of handles) {
          expect(handle.getAttribute('role')).toBe('separator');
          expect(Number(handle.getAttribute('aria-valuenow'))).not.toBeNaN();
          expect(handle.getAttribute('aria-valuemin')).not.toBeNull();
          expect(handle.getAttribute('aria-valuemax')).not.toBeNull();
        }
      } finally {
        cleanup();
      }
    });
  }

  it('the first handle reports the leading panel size as aria-valuenow', async () => {
    const { root, cleanup } = await renderScenario(
      { panels: [{ defaultSize: 30 }, { defaultSize: 70 }] },
      'Resize section',
    );
    try {
      const handle = partElement(root, 'handle');
      expect(handle?.getAttribute('aria-valuenow')).toBe('30');
    } finally {
      cleanup();
    }
  });

  it('ArrowRight grows the leading panel, ArrowLeft shrinks it', async () => {
    const { root, cleanup } = await renderScenario(
      { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
      'Resize section',
    );
    try {
      const handle = partElement(root, 'handle');
      expect(handle?.getAttribute('aria-valuenow')).toBe('50');
      const user = userEvent.setup();
      handle?.focus();
      await user.keyboard('{ArrowRight}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('51');
      await user.keyboard('{ArrowLeft}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('50');
    } finally {
      cleanup();
    }
  });

  it('Shift+Arrow moves ten, Home/End reach the leading panel bounds', async () => {
    const { root, cleanup } = await renderScenario(
      { panels: [{ defaultSize: 50, minSize: 10, maxSize: 90 }, { defaultSize: 50 }] },
      'Resize section',
    );
    try {
      const handle = partElement(root, 'handle');
      const user = userEvent.setup();
      handle?.focus();
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('60');
      await user.keyboard('{Home}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('10');
      await user.keyboard('{End}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('90');
    } finally {
      cleanup();
    }
  });

  it('vertical: ArrowDown grows the leading panel', async () => {
    const { root, cleanup } = await renderScenario(
      { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] },
      'Resize section',
    );
    try {
      const handle = partElement(root, 'handle');
      expect(handle?.getAttribute('aria-orientation')).toBe('horizontal');
      const user = userEvent.setup();
      handle?.focus();
      await user.keyboard('{ArrowDown}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('41');
    } finally {
      cleanup();
    }
  });

  it('disabled: separators leave the tab order and keys do not resize', async () => {
    const { root, cleanup } = await renderScenario(
      { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
      'Resize section',
    );
    try {
      const handle = partElement(root, 'handle');
      expect(handle?.getAttribute('tabindex')).toBe('-1');
      expect(handle?.getAttribute('aria-disabled')).toBe('true');
      const user = userEvent.setup();
      handle?.focus();
      await user.keyboard('{ArrowRight}');
      expect(handle?.getAttribute('aria-valuenow')).toBe('50');
    } finally {
      cleanup();
    }
  });
});
