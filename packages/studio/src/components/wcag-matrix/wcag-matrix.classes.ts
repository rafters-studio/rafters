import type { WcagMatrixConfig, WcagMatrixState } from './wcag-matrix.behavior';

export interface WcagMatrixClassSet {
  root: string;
  header: string;
  headerCell: string;
  row: string;
  rowLabel: string;
  cell: string;
  cellEmpty: string;
  cellLabel: string;
}

export function wcagMatrixClasses(
  _config: WcagMatrixConfig,
  _state: WcagMatrixState,
): WcagMatrixClassSet {
  return {
    root: 'grid gap-px w-full',
    header: 'grid grid-cols-12 gap-px',
    headerCell: 'text-label-small ts-label-small text-muted-foreground text-center',
    row: 'grid grid-cols-12 gap-px',
    rowLabel: 'text-label-small ts-label-small text-muted-foreground flex items-center',
    cell: 'size-7 rounded-sm flex items-center justify-center',
    cellEmpty: 'size-7 rounded-sm',
    cellLabel: 'text-label-small ts-label-small',
  };
}
