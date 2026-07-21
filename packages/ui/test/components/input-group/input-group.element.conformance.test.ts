/**
 * WC performance of the input-group score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves the projection and
 * the disabled propagation reach an AUTHORED control the element never rendered.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersInputGroup } from '../../../src/components/input-group/input-group.element';
import { inputGroupBehavior } from '../../../src/components/input-group/input-group.behavior';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-input-group')) {
    customElements.define('rafters-input-group', RaftersInputGroup);
  }
});

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-input-group') as HTMLElement;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('input-group conformance [wc]', () => {
  it('valid: fulfils the contract with both affixes, omitting aria-invalid', async () => {
    const root = await mount(
      `<rafters-input-group data-part="root">
        <div data-part="addonStart">$</div>
        <input data-part="control" id="amount" aria-label="Amount" />
        <div data-part="addonEnd">USD</div>
      </rafters-input-group>`,
    );
    assertContractFulfillment(inputGroupBehavior, root, {}, { invalid: false }, [
      'root',
      'control',
      'addonStart',
      'addonEnd',
    ]);
    expect(control().hasAttribute('aria-invalid')).toBe(false);
    expect(root.getAttribute('data-state')).toBe('default');
  });

  it('invalid: the data-invalid host signal projects onto the control', async () => {
    const root = await mount(
      `<rafters-input-group data-part="root" data-invalid>
        <input data-part="control" id="amount" aria-label="Amount" />
      </rafters-input-group>`,
    );
    assertContractFulfillment(inputGroupBehavior, root, {}, { invalid: true }, ['root', 'control']);
    expect(control().getAttribute('aria-invalid')).toBe('true');
    expect(control().getAttribute('data-state')).toBe('invalid');
    expect(root.getAttribute('data-state')).toBe('invalid');
  });

  it('affixes get the side they sit on from the score, not from the markup', async () => {
    const root = await mount(
      `<rafters-input-group data-part="root">
        <div data-part="addonStart">$</div>
        <input data-part="control" id="amount" aria-label="Amount" />
        <div data-part="addonEnd">USD</div>
      </rafters-input-group>`,
    );
    expect(partElement(root, 'addonStart')?.getAttribute('data-position')).toBe('start');
    expect(partElement(root, 'addonEnd')?.getAttribute('data-position')).toBe('end');
  });

  it('finds and stamps a bare authored control that carries no data-part', async () => {
    const root = await mount(
      `<rafters-input-group data-part="root">
        <input id="amount" aria-label="Amount" />
      </rafters-input-group>`,
    );
    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('data-part')).toBe('control');
  });

  it('a disabled group disables the control AND an affix action button', async () => {
    await mount(
      `<rafters-input-group data-part="root" disabled>
        <input data-part="control" id="code" aria-label="Code" />
        <div data-part="addonEnd"><button type="button">Apply</button></div>
      </rafters-input-group>`,
    );
    expect(control().disabled).toBe(true);
    const button = document.body.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('an enabled group never re-enables an individually disabled control', async () => {
    await mount(
      `<rafters-input-group data-part="root">
        <input data-part="control" id="code" aria-label="Code" disabled />
      </rafters-input-group>`,
    );
    // The oracle assigned disabled unconditionally and would have cleared this.
    expect(control().disabled).toBe(true);
  });

  it('the contained control keeps its own value: typing works with no group state', async () => {
    const user = userEvent.setup();
    await mount(
      `<rafters-input-group data-part="root">
        <div data-part="addonStart">$</div>
        <input data-part="control" id="amount" aria-label="Amount" value="" />
      </rafters-input-group>`,
    );
    await user.type(control(), '42');
    expect(control().value).toBe('42');
  });

  it('binds nothing when the group contains no control at all', async () => {
    const root = await mount(
      `<rafters-input-group data-part="root"><div data-part="addonStart">$</div></rafters-input-group>`,
    );
    expect(root.hasAttribute('data-state')).toBe(false);
  });
});
