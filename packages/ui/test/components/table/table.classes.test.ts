import { describe, expect, it } from 'vitest';
import {
  tableBodyClasses,
  tableCaptionClasses,
  tableCellClasses,
  tableFooterClasses,
  tableHeadClasses,
  tableHeaderClasses,
  tableRootClasses,
  tableRowClasses,
  tableWrapperClasses,
} from '../../../src/components/table/table.classes';

describe('table classes', () => {
  it('the root carries full width and semantic body typography', () => {
    expect(tableRootClasses).toBe('w-full caption-bottom text-body-small ts-body-small');
  });

  it('the wrapper scrolls wide data horizontally', () => {
    expect(tableWrapperClasses).toBe('relative w-full overflow-auto');
  });

  it('the header underlines its row and the footer tops-borders on a muted surface', () => {
    expect(tableHeaderClasses).toBe('[&_tr]:border-b');
    expect(tableFooterClasses).toBe(
      'border-t bg-muted/50 text-label-medium ts-label-medium [&>tr]:last:border-b-0',
    );
  });

  it('the body drops the last row border', () => {
    expect(tableBodyClasses).toBe('[&_tr:last-child]:border-0');
  });

  it('the row declares the selected hook and a colour transition, no raw duration', () => {
    expect(tableRowClasses).toContain('data-[state=selected]:bg-muted');
    expect(tableRowClasses).toContain('transition-colors');
    expect(tableRowClasses).toContain('motion-reduce:transition-none');
    // Motion durations come from tokens (Spec 04), never a hardcoded utility.
    expect(tableRowClasses).not.toMatch(/duration-\d/);
  });

  it('header and data cells carry muted label typography and the checkbox flush', () => {
    expect(tableHeadClasses).toContain('text-label-medium ts-label-medium');
    expect(tableHeadClasses).toContain('text-muted-foreground');
    expect(tableHeadClasses).toContain('text-left');
    expect(tableCellClasses).toContain('align-middle');
    expect(tableCellClasses).toContain('[&:has([role=checkbox])]:pr-0');
  });

  it('the caption is muted small text', () => {
    expect(tableCaptionClasses).toBe('text-body-small ts-body-small text-muted-foreground');
  });

  it('never emits a raw arbitrary colour or spacing value', () => {
    for (const cls of [
      tableRootClasses,
      tableRowClasses,
      tableHeadClasses,
      tableCellClasses,
      tableFooterClasses,
    ]) {
      expect(cls).not.toMatch(/\[[0-9]/);
      expect(cls).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });
});
