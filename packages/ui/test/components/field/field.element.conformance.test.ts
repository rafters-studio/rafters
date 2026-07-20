/**
 * WC performance of the field score, driven end to end against light-DOM
 * markup. Field is a light-DOM enhancer: the author supplies the label /
 * control / helper markup and the element only wires it. Same score as the
 * React and Astro conformance tests -- proves the id-association and the ARIA
 * projection through the DOM-native client.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersField } from '../../../src/components/field/field.element';
import { fieldBehavior } from '../../../src/components/field/field.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-field')) customElements.define('rafters-field', RaftersField);
});

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await Promise.resolve(); // let the deferred connectedCallback bind run
  return document.body.querySelector('rafters-field') as HTMLElement;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;
const label = () => document.body.querySelector<HTMLLabelElement>('[data-part="label"]')!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('field conformance [wc]', () => {
  it('basic: associates label<->control, no validity aria, axe-clean', async () => {
    const root = await mount(
      `<rafters-field>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
      </rafters-field>`,
    );
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control']);
    expect(label().getAttribute('for')).toBe('email');
    expect(control().hasAttribute('aria-invalid')).toBe(false);
    expect(control().hasAttribute('aria-required')).toBe(false);
    await assertAxeClean(root);
  });

  it('locates and stamps a bare slotted control (no data-part authored)', async () => {
    await mount(
      `<rafters-field>
        <label data-part="label">Email</label>
        <input id="email" type="email" />
      </rafters-field>`,
    );
    // bindField found the input by tag and stamped the part marker.
    expect(control().getAttribute('data-part')).toBe('control');
    expect(label().getAttribute('for')).toBe('email');
  });

  it('description: control describedby wired to the description id', async () => {
    const root = await mount(
      `<rafters-field>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
        <div data-part="description" id="email-description">We never share your email</div>
      </rafters-field>`,
    );
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control', 'description']);
    expect(control().getAttribute('aria-describedby')).toBe('email-description');
    expect(control().hasAttribute('aria-invalid')).toBe(false);
    await assertAxeClean(root);
  });

  it('error: aria-invalid true, describedby to the error id, role=alert', async () => {
    const root = await mount(
      `<rafters-field>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
        <div data-part="error" id="email-error" role="alert">Email is required</div>
      </rafters-field>`,
    );
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control', 'error']);
    expect(control().getAttribute('aria-invalid')).toBe('true');
    expect(control().getAttribute('aria-describedby')).toBe('email-error');
    expect(partElement(root, 'error')?.getAttribute('role')).toBe('alert');
    await assertAxeClean(root);
  });

  it('required host signal projects aria-required onto the control', async () => {
    const root = await mount(
      `<rafters-field data-required>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
      </rafters-field>`,
    );
    assertContractFulfillment(fieldBehavior, root, {}, { required: true }, ['label', 'control']);
    expect(control().getAttribute('aria-required')).toBe('true');
  });

  it('disabled host signal propagates to the control (native)', async () => {
    await mount(
      `<rafters-field data-disabled>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
      </rafters-field>`,
    );
    expect(control().disabled).toBe(true);
  });
});
