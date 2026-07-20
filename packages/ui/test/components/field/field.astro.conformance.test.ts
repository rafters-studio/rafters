/**
 * Astro performance of the field score, driven end to end. AstroContainer
 * renders the SSR markup (label + `<slot/>` control + helper/error) but does
 * NOT run the `<script>`, so the test calls bindField directly on the
 * rafters-field root -- that IS the script's job -- then asserts the same
 * projection the React and WC performances drive. One score, three
 * performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Field from '../../../src/components/field/field.astro';
import { bindField, fieldBehavior } from '../../../src/components/field/field.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Field, {
    props: { id: 'email', label: 'Email', ...props },
    // The slotted control carries the same id the field prop declares.
    slots: { default: '<input id="email" type="email" />' },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('rafters-field') as HTMLElement;
  bindField(root); // the <script> does this per instance on the real page
  return root;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;
const label = () => document.body.querySelector<HTMLLabelElement>('[data-part="label"]')!;

describe('field conformance [astro]', () => {
  it('basic: SSR associates label<->control, no validity aria, axe-clean', async () => {
    const root = await mount();
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control']);
    expect(label().getAttribute('for')).toBe('email');
    expect(control().getAttribute('data-part')).toBe('control');
    expect(control().hasAttribute('aria-invalid')).toBe(false);
    await assertAxeClean(root);
  });

  it('description: control describedby wired to the description id, axe-clean', async () => {
    const root = await mount({ description: 'We never share your email' });
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control', 'description']);
    expect(control().getAttribute('aria-describedby')).toBe('email-description');
    await assertAxeClean(root);
  });

  it('error: aria-invalid true, describedby to the error id, role=alert, description hidden', async () => {
    const root = await mount({
      description: 'We never share your email',
      error: 'Email is required',
    });
    assertContractFulfillment(fieldBehavior, root, {}, {}, ['label', 'control', 'error']);
    expect(control().getAttribute('aria-invalid')).toBe('true');
    expect(control().getAttribute('aria-describedby')).toBe('email-error');
    expect(partElement(root, 'error')?.getAttribute('role')).toBe('alert');
    expect(partElement(root, 'description')).toBeNull();
    await assertAxeClean(root);
  });

  it('required host signal projects aria-required onto the control', async () => {
    const root = await mount({ required: true });
    assertContractFulfillment(fieldBehavior, root, {}, { required: true }, ['label', 'control']);
    expect(control().getAttribute('aria-required')).toBe('true');
  });

  it('disabled host signal propagates to the control (native)', async () => {
    await mount({ disabled: true });
    expect(control().disabled).toBe(true);
  });
});
