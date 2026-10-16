import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/tabs/tabs.element';

function render(opts: { vertical?: boolean; icon?: boolean; disabled?: boolean }): string {
  const orientation = opts.vertical ? 'vertical' : 'horizontal';
  const icon = opts.icon
    ? '<svg slot="start-icon" viewBox="0 0 4 4" width="16" height="16"></svg>'
    : '';
  const disabled = opts.disabled ? ' disabled' : '';
  const trigger = (v: string, active: boolean, extra = '') =>
    `<button type="button" role="tab" id="d-tab-${v}" data-part="trigger" data-value="${v}" tabindex="${active ? 0 : -1}" aria-selected="${active}" aria-controls="d-panel-${v}" data-state="${active ? 'active' : 'inactive'}"${extra}>${v === 'overview' ? icon : ''}${v}</button>`;
  const panel = (v: string, active: boolean) =>
    `<div role="tabpanel" id="d-panel-${v}" data-part="panel" data-value="${v}" tabindex="0" aria-labelledby="d-tab-${v}" data-state="${active ? 'active' : 'inactive'}"${active ? '' : ' hidden'}><p>${v} body</p></div>`;
  return `<main><rafters-tabs data-part="root" id="d-root" data-orientation="${orientation}"><div data-part="list" id="d-list" role="tablist" aria-orientation="${orientation}">${trigger('overview', true)}${trigger('details', false, disabled)}</div>${panel('overview', true)}${panel('details', false)}</rafters-tabs></main>`;
}

const scenes: ReadonlyArray<[string, Parameters<typeof render>[0]]> = [
  ['default', {}],
  ['vertical', { vertical: true }],
  ['icon', { icon: true }],
  ['disabled trigger', { disabled: true }],
];

for (const [name, opts] of scenes) {
  test(`tabs.element ${name}`, async ({ task }) => {
    document.body.innerHTML = render(opts);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
