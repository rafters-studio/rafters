import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/resizable/resizable.element';
import {
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';

function attrs(record: Record<string, string | boolean | undefined>): string {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value)}"`)
    .join('');
}

function markup(config: ResizableConfig): string {
  const state = resizableBehavior.initialState(config);
  const classes = resizableClasses(config, state);
  const ids = { root: 'r-root', panel: 'r-panel', handle: 'r-handle' };
  const root = resizableBehavior.aria(state, config, ids).root ?? {};
  const parts = config.panels.map((panel, i) => {
    const panelHtml = `<div data-part="panel" data-index="${i}" data-panel-default="${panel.defaultSize}" data-panel-min="${panel.minSize}" data-panel-max="${panel.maxSize}" class="${classes.panel}" style="flex-basis:${state.sizes[i]}%">Panel ${i}</div>`;
    if (i === config.panels.length - 1) return panelHtml;
    const handleAria = resizableHandleAria(String(i), state, config);
    const disabled = config.disabled ? ' data-disabled="true"' : '';
    return `${panelHtml}<div role="separator" data-part="handle" data-index="${i}" data-value="${i}"${disabled} tabindex="${config.disabled ? -1 : 0}" aria-label="Resize" class="${classes.handle}"${attrs(handleAria)}></div>`;
  });
  return `<rafters-resizable><div data-part="root" id="${ids.root}" data-direction="${config.direction}" class="${classes.root}"${attrs(root)}>${parts.join('')}</div></rafters-resizable>`;
}

const panels = [
  { defaultSize: 50, minSize: 20, maxSize: 100 },
  { defaultSize: 50, minSize: 0, maxSize: 100 },
];

const scenes: ReadonlyArray<[string, ResizableConfig]> = [
  ['horizontal', { direction: 'horizontal', disabled: false, panels }],
  ['vertical', { direction: 'vertical', disabled: false, panels }],
  [
    'with-handle',
    {
      direction: 'horizontal',
      disabled: false,
      panels: [
        { defaultSize: 25, minSize: 10, maxSize: 90 },
        { defaultSize: 75, minSize: 10, maxSize: 90 },
      ],
    },
  ],
  ['disabled', { direction: 'horizontal', disabled: true, panels }],
];

for (const [name, config] of scenes) {
  test(`rafters-resizable ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${markup(config)}</main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
