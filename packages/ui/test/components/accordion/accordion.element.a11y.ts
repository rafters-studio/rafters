import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/accordion/accordion.element';
import type { AriaAttrs } from '../../../src/lib/contract';
import {
  accordion,
  accordionInstanceAria,
  type AccordionConfig,
} from '../../../src/components/accordion/accordion.behavior';
import { accordionClasses } from '../../../src/components/accordion/accordion.classes';

const VALUES = ['a', 'b'] as const;

function attrs(record: AriaAttrs | undefined): string {
  return Object.entries(record ?? {})
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${v === true ? '' : String(v)}"`)
    .join(' ');
}

async function mount(config: AccordionConfig): Promise<HTMLElement> {
  const state = accordion.initialState(config);
  const classes = accordionClasses(config, state);
  const rootAria = accordion.aria(state, config, {
    root: 'acc-root',
    item: '',
    heading: '',
    trigger: '',
    content: '',
  });
  const items = VALUES.map((value) => {
    const ids = { trigger: `acc-trigger-${value}`, content: `acc-content-${value}` };
    return `<div data-part="item" data-value="${value}" class="${classes.item}" ${attrs(accordionInstanceAria('item', value, state, config, {}))}>
      <div data-part="heading" data-value="${value}" class="${classes.heading}" ${attrs(accordionInstanceAria('heading', value, state, config, {}))}>
        <button type="button" id="${ids.trigger}" data-part="trigger" data-value="${value}" data-roving-item ${config.disabled ? 'disabled' : ''} class="${classes.trigger}" ${attrs(accordionInstanceAria('trigger', value, state, config, ids))}>Section ${value}<svg aria-hidden="true" class="${classes.triggerIcon}"></svg></button>
      </div>
      <div id="${ids.content}" data-part="content" data-value="${value}" class="${classes.content}" ${attrs(accordionInstanceAria('content', value, state, config, ids))}>
        <div class="${classes.contentInner}">Body ${value}</div>
      </div>
    </div>`;
  }).join('');
  document.body.innerHTML = `<main><rafters-accordion data-part="root" id="acc-root" class="${classes.root}" ${attrs(rootAria.root)}>${items}</rafters-accordion></main>`;
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  const main = document.body.querySelector('main');
  if (!(main instanceof HTMLElement)) throw new Error('main missing');
  return main;
}

const scenes: ReadonlyArray<[string, AccordionConfig]> = [
  ['collapsed', { type: 'single' }],
  ['open', { type: 'single', defaultValue: 'b' }],
  ['multiple', { type: 'multiple', defaultValue: ['a', 'b'] }],
  ['disabled', { type: 'single', disabled: true }],
];

for (const [name, config] of scenes) {
  test(`rafters-accordion ${name}`, async ({ task }) => {
    const host = await mount(config);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
