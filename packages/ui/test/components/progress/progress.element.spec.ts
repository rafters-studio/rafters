import { expect, it } from 'vitest';
import '../../../src/components/progress/progress.element';
import {
  progress,
  resolveProgress,
  type ProgressConfig,
} from '../../../src/components/progress/progress.behavior';
import { progressClasses } from '../../../src/components/progress/progress.classes';

/** The light-DOM markup progress.astro:102-114 renders for `config`, on the host. */
function astroMarkup(config: ProgressConfig, extra = ''): string {
  const classes = progressClasses(config, {});
  const aria = progress.aria({}, config, { root: '', indicator: '' });
  const { indeterminate, percent } = resolveProgress(config);
  const attrs = (record: Record<string, string | boolean | undefined>): string =>
    Object.entries(record)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${String(v)}"`)
      .join(' ');
  const root = attrs({
    'data-part': 'root',
    'data-value': indeterminate ? undefined : String(config.value),
    'data-max': String(config.max ?? 100),
    'data-variant': config.variant ?? 'default',
    'data-size': config.size ?? 'default',
    'data-value-text': config.valueText,
    class: classes.root,
    ...aria.root,
  });
  const indicator = attrs({
    'data-part': 'indicator',
    class: classes.indicator,
    style: indeterminate ? undefined : `width: ${percent}%`,
    ...aria.indicator,
  });
  return `<rafters-progress ${root} ${extra}><div ${indicator}></div></rafters-progress>`;
}

async function mount(config: ProgressConfig, extra = ''): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${astroMarkup(config, extra)}</main>`;
  const el = document.body.querySelector('rafters-progress');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-progress did not mount');
  await Promise.resolve(); // binds one microtask after connect (05-authoring.md:210-211)
  return el;
}

function expectPerforms(el: HTMLElement, config: ProgressConfig): void {
  const aria = progress.aria({}, config, { root: '', indicator: '' });
  const classes = progressClasses(config, {});
  expect(el.className).toBe(classes.root);
  for (const [key, value] of Object.entries(aria.root ?? {})) {
    expect(el.getAttribute(key)).toBe(value === undefined ? null : String(value));
  }
  const indicator = el.querySelector<HTMLElement>('[data-part="indicator"]');
  if (!indicator) throw new Error('indicator missing');
  expect(indicator.className).toBe(classes.indicator);
  expect(indicator.getAttribute('aria-hidden')).toBe('true');
  const { indeterminate, percent } = resolveProgress(config);
  expect(indicator.style.width).toBe(indeterminate ? '' : `${percent}%`);
}

it('performs a determinate bar on the host', async () => {
  const el = await mount({ value: 40 }, 'aria-label="Upload"');
  expectPerforms(el, { value: 40 });
  expect(el.getAttribute('aria-label')).toBe('Upload');
});

it('performs an indeterminate bar', async () => {
  const el = await mount({}, 'aria-label="Loading"');
  expectPerforms(el, {});
  expect(el.getAttribute('aria-busy')).toBe('true');
});

it('data-value-text overrides the percent label', async () => {
  const config = { value: 3, max: 10, valueText: '3 of 10 files' };
  const el = await mount(config, 'aria-label="Files"');
  expectPerforms(el, config);
  expect(el.getAttribute('aria-valuetext')).toBe('3 of 10 files');
});

it('re-derives on attribute change', async () => {
  const el = await mount({ value: 40 }, 'aria-label="Upload"');
  el.setAttribute('data-value', '80');
  el.setAttribute('data-variant', 'success');
  await Promise.resolve();
  expectPerforms(el, { value: 80, variant: 'success' });
  el.removeAttribute('data-value');
  await Promise.resolve();
  expectPerforms(el, { variant: 'success' });
  expect(el.getAttribute('aria-label')).toBe('Upload');
});
