/**
 * React performance of the field score, driven end to end. The shadcn Field
 * surface: a container that pairs a label with a slotted control and optional
 * helper/error text, wiring the id-association + validity ARIA the score
 * projects. Same score as the WC and Astro conformance tests.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Field } from '../../../src/components/field/field';
import { fieldBehavior } from '../../../src/components/field/field.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

const controlOf = (host: HTMLElement) => partElement(host, 'control') as HTMLInputElement;
const labelOf = (host: HTMLElement) => partElement(host, 'label') as HTMLLabelElement;

describe('field conformance [react]', () => {
  it('basic: associates label<->control, no validity aria, axe-clean', async () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" />
      </Field>,
    );
    assertContractFulfillment(fieldBehavior, container, {}, {}, ['label', 'control']);
    const control = controlOf(container);
    expect(labelOf(container).getAttribute('for')).toBe(control.id);
    expect(control.id.length).toBeGreaterThan(0);
    expect(control.hasAttribute('aria-invalid')).toBe(false);
    expect(control.hasAttribute('aria-required')).toBe(false);
    expect(control.hasAttribute('aria-describedby')).toBe(false);
    await assertAxeClean(container);
  });

  it('description: control describedby wired to the description id, axe-clean', async () => {
    const { container } = render(
      <Field label="Email" description="We never share your email">
        <input type="email" />
      </Field>,
    );
    assertContractFulfillment(fieldBehavior, container, {}, {}, [
      'label',
      'control',
      'description',
    ]);
    const control = controlOf(container);
    const description = partElement(container, 'description');
    expect(control.getAttribute('aria-describedby')).toBe(description?.id);
    expect(control.hasAttribute('aria-invalid')).toBe(false);
    await assertAxeClean(container);
  });

  it('error: aria-invalid true, describedby to the error id, role=alert, description hidden', async () => {
    const { container } = render(
      <Field label="Email" description="We never share your email" error="Email is required">
        <input type="email" />
      </Field>,
    );
    assertContractFulfillment(fieldBehavior, container, {}, {}, ['label', 'control', 'error']);
    const control = controlOf(container);
    const error = partElement(container, 'error');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.getAttribute('aria-describedby')).toBe(error?.id);
    expect(error?.getAttribute('role')).toBe('alert');
    // description-hidden-while-error: only one helper node is rendered.
    expect(partElement(container, 'description')).toBeNull();
    await assertAxeClean(container);
  });

  it('required: aria-required on the control and an aria-hidden marker', async () => {
    const { container } = render(
      <Field label="Email" required>
        <input type="email" />
      </Field>,
    );
    assertContractFulfillment(fieldBehavior, container, {}, { required: true }, [
      'label',
      'control',
    ]);
    expect(controlOf(container).getAttribute('aria-required')).toBe('true');
    const marker = labelOf(container).querySelector('[aria-hidden="true"]');
    expect(marker?.textContent).toBe('*');
    await assertAxeClean(container);
  });

  it('disabled: propagates to the control (native), axe-clean', async () => {
    const { container } = render(
      <Field label="Email" disabled>
        <input type="email" />
      </Field>,
    );
    expect(controlOf(container).disabled).toBe(true);
    await assertAxeClean(container);
  });

  it('respects an author-supplied control id: the label tracks it', async () => {
    const { container } = render(
      <Field label="Email">
        <input id="signup-email" type="email" />
      </Field>,
    );
    expect(controlOf(container).id).toBe('signup-email');
    expect(labelOf(container).getAttribute('for')).toBe('signup-email');
  });
});
