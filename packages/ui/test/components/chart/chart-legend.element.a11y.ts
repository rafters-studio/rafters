import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/chart/chart-legend.element';
import { legendEntries } from '../../../src/components/chart/chart-legend.behavior';
import type { ChartConfig } from '../../../src/components/chart/chart.behavior';

const config = {
  desktop: { label: 'Desktop', token: 'chart-1' },
  mobile: { label: 'Mobile', token: 'chart-2' },
} satisfies ChartConfig;

interface Scene {
  cfg: ChartConfig;
  nameKey?: string;
  focusFirst?: boolean;
}

/** The light-DOM shape chart-legend.element.ts documents: entries are
 *  rendered ahead of time (here from the same `legendEntries` the Astro
 *  template reads) and the element only projects the list roles and composes
 *  roving-focus over them. */
function markup(cfg: ChartConfig, nameKey: string | undefined): string {
  const entries = legendEntries(cfg, nameKey)
    .map(
      (entry) => `
        <span data-part="entry" data-roving-item tabindex="0">
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <rect width="10" height="10" rx="2" class="${entry.swatchClass}"></rect>
          </svg>
          <span>${entry.label}</span>
        </span>`,
    )
    .join('');
  return `<main><rafters-chart-legend data-part="root">${entries}</rafters-chart-legend></main>`;
}

async function mount({ cfg, nameKey, focusFirst = false }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = markup(cfg, nameKey);
  await Promise.resolve(); // the element binds one microtask after connecting
  if (focusFirst) {
    const entry = document.body.querySelector<HTMLElement>('[data-part="entry"]') as HTMLElement;
    entry.focus();
    expect(document.activeElement).toBe(entry);
  }
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['default', { cfg: config }],
  ['empty config', { cfg: {} }],
  ['nameKey overriding every label', { cfg: config, nameKey: 'mobile' }],
  ['first entry focused', { cfg: config, focusFirst: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-chart-legend ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
