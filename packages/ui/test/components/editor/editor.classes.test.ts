/**
 * editor.classes.test.ts -- the editor score's visual projection
 * (FR-EDITOR-005). Root-only: one class string, no per-block classes.
 */
import { describe, expect, it } from 'vitest';
import { createEditorHistory } from '../../../src/components/editor/editor-history';
import type { EditorConfig } from '../../../src/components/editor/editor.behavior';
import { editorClasses } from '../../../src/components/editor/editor.classes';

describe('editorClasses', () => {
  const config: EditorConfig = { label: 'Document' };
  const { memory } = createEditorHistory();
  const state = memory.get();

  it('returns exactly one class string, keyed root', () => {
    const classes = editorClasses(config, state);
    expect(Object.keys(classes)).toEqual(['root']);
    expect(typeof classes.root).toBe('string');
    expect(classes.root.length).toBeGreaterThan(0);
  });

  it('styles disabled/readonly off data-disabled/data-readonly, not aria-disabled', () => {
    // editorAria never projects aria-disabled (spec: role/aria-multiline/label
    // only) -- an aria-disabled: variant here would be permanently dead.
    const classes = editorClasses(config, state);
    expect(classes.root).not.toContain('aria-disabled:');
    expect(classes.root).toContain('data-[disabled=true]:');
    expect(classes.root).toContain('data-[readonly=true]:');
  });
});
