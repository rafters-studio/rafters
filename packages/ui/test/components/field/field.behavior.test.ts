import { describe, expect, it } from 'vitest';
import type { PartIds } from '../../../src/lib/contract';
import {
  descriptionId,
  errorId,
  fieldBehavior,
  fieldControlAria,
  type FieldConfig,
  type FieldPart,
} from '../../../src/components/field/field.behavior';

const idsOf = (over: Partial<PartIds<FieldPart>> = {}): PartIds<FieldPart> => ({
  label: '',
  control: 'f',
  description: '',
  error: '',
  ...over,
});

function ariaAt(config: FieldConfig, ids: PartIds<FieldPart> = idsOf()) {
  return fieldBehavior.aria({}, config, ids);
}

describe('field parts', () => {
  it('declares the control plus optional description and error targets', () => {
    expect(Object.keys(fieldBehavior.parts).sort()).toEqual([
      'control',
      'description',
      'error',
      'label',
    ]);
    expect(fieldBehavior.parts.control.optional).toBeUndefined();
    expect(fieldBehavior.parts.description.optional).toBe(true);
    expect(fieldBehavior.parts.error.optional).toBe(true);
  });

  it('projects role="alert" on the error message as a PartDecl role', () => {
    expect(fieldBehavior.parts.error.role).toBe('alert');
    // label carries no role -- its `for` association is native, not ARIA.
    expect(fieldBehavior.parts.label.role).toBeUndefined();
  });
});

describe('field state (a static, projection-only score)', () => {
  it('has no state axis and dispatches nothing', () => {
    expect(fieldBehavior.initialState({})).toEqual({});
    expect(fieldBehavior.canDispatch({}, 'never' as never, {})).toBe(true);
    expect(fieldBehavior.keymap({ key: 'Enter' }, {}, 'control', {})).toBeNull();
    expect(Object.keys(fieldBehavior.actions)).toEqual([]);
  });
});

describe('field aria projection (the contract)', () => {
  it('valid + no helpers: the control carries no describedby, invalid, or required', () => {
    expect(ariaAt({})).toEqual({
      control: {
        'aria-describedby': undefined,
        'aria-invalid': undefined,
        'aria-required': undefined,
      },
    });
  });

  it('error present: aria-invalid true, describedby wired to the error id', () => {
    const aria = ariaAt({}, idsOf({ error: 'f-error' }));
    expect(aria.control?.['aria-invalid']).toBe('true');
    expect(aria.control?.['aria-describedby']).toBe('f-error');
  });

  it('description present: describedby wired to the description id, not invalid', () => {
    const aria = ariaAt({}, idsOf({ description: 'f-description' }));
    expect(aria.control?.['aria-describedby']).toBe('f-description');
    expect(aria.control?.['aria-invalid']).toBeUndefined();
  });

  it('required projects aria-required on the control', () => {
    expect(ariaAt({ required: true }).control?.['aria-required']).toBe('true');
  });

  it('composes describedby error-first, then description, when both ids are present', () => {
    const aria = ariaAt({}, idsOf({ error: 'f-error', description: 'f-description' }));
    expect(aria.control?.['aria-describedby']).toBe('f-error f-description');
  });

  it('references ONLY real ids -- an empty id never dangles', () => {
    // Presence is read from the ids the harness reads off the DOM, so a hidden
    // (unrendered) helper contributes no id and is never referenced.
    expect(ariaAt({}, idsOf({ error: '', description: '' })).control?.['aria-describedby']).toBe(
      undefined,
    );
  });

  it('does NOT project disabled -- propagation is native, a decorator/bind concern', () => {
    const aria = ariaAt({ disabled: true }, idsOf({ error: 'f-error' }));
    expect('disabled' in (aria.control ?? {})).toBe(false);
    expect('aria-disabled' in (aria.control ?? {})).toBe(false);
  });
});

describe('field id scheme', () => {
  it('derives the sibling ids from the field id', () => {
    expect(descriptionId('email')).toBe('email-description');
    expect(errorId('email')).toBe('email-error');
  });
});

describe('fieldControlAria (the React declarative helper)', () => {
  it('guards describedby/invalid on rendered presence', () => {
    expect(fieldControlAria('f', {}, false, false)).toEqual({
      'aria-describedby': undefined,
      'aria-invalid': undefined,
      'aria-required': undefined,
    });
    expect(fieldControlAria('f', {}, true, false)).toEqual({
      'aria-describedby': 'f-error',
      'aria-invalid': 'true',
      'aria-required': undefined,
    });
    expect(fieldControlAria('f', { required: true }, false, true)).toEqual({
      'aria-describedby': 'f-description',
      'aria-invalid': undefined,
      'aria-required': 'true',
    });
  });
});
