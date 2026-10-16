import { expect, it } from 'vitest';
import { alert, ALERT_VARIANTS } from '../../../src/components/alert/alert.behavior';
import {
  alertActionClasses,
  alertClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from '../../../src/components/alert/alert.classes';
import { RaftersAlert } from '../../../src/components/alert/alert.element';

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<main>${html}</main>`;
  const el = document.querySelector('rafters-alert');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-alert did not mount');
  return el;
}

function rootOf(host: HTMLElement): HTMLElement {
  const root = host.shadowRoot?.querySelector('[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  return root;
}

function part(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`missing ${selector}`);
  return el;
}

it('renders the root with role and classes, and the text in the default slot', () => {
  const host = mount('<rafters-alert>Saved</rafters-alert>');
  expect(host).toBeInstanceOf(RaftersAlert);
  const root = rootOf(host);
  expect(root.className).toBe(alertClasses({}, {}).root);
  expect(root.getAttribute('role')).toBe(alert.aria({}, {}, { root: '' }).root?.role);
  const slot = root.querySelector(':scope > slot:not([name])');
  if (!(slot instanceof HTMLSlotElement)) throw new Error('no default slot');
  expect(slot.assignedNodes()[0]?.textContent).toBe('Saved');
});

it('renders the three regions and assigns named children', () => {
  const host = mount(
    '<rafters-alert variant="warning"><span slot="title">Heads up</span>' +
      '<span slot="description">Disk almost full</span><span slot="action">Fix</span></rafters-alert>',
  );
  const root = rootOf(host);
  expect(root.className).toBe(alertClasses({ variant: 'warning' }, {}).root);
  const title = part(root, '[data-slot="alert-title"]');
  expect(title.tagName).toBe('DIV');
  expect(title.className).toBe(alertTitleClasses);
  expect(part(root, '[data-slot="alert-description"]').className).toBe(alertDescriptionClasses);
  expect(part(root, '[data-slot="alert-action"]').className).toBe(alertActionClasses);
  for (const name of ['title', 'description', 'action']) {
    const slot = part(root, `[data-slot="alert-${name}"] slot[name="${name}"]`);
    if (!(slot instanceof HTMLSlotElement)) throw new Error('not a slot');
    expect(slot.assignedElements()[0]?.getAttribute('slot')).toBe(name);
  }
  expect(root.querySelector(':scope > slot:not([name])')).not.toBeNull();
});

it('renders all regions when unfilled', () => {
  const root = rootOf(mount('<rafters-alert></rafters-alert>'));
  for (const name of ['title', 'description', 'action']) {
    expect(root.querySelector(`[data-slot="alert-${name}"] slot[name="${name}"]`)).not.toBeNull();
  }
});

it('performs every variant and falls back to default on an unknown one', () => {
  for (const v of ALERT_VARIANTS) {
    expect(rootOf(mount(`<rafters-alert variant="${v}">x</rafters-alert>`)).className).toBe(
      alertClasses({ variant: v }, {}).root,
    );
  }
  expect(rootOf(mount('<rafters-alert variant="nope">x</rafters-alert>')).className).toBe(
    alertClasses({}, {}).root,
  );
});
