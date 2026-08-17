import type { ColorCardConfig, ColorCardState } from './color-card.behavior';

export interface ColorCardClassSet {
  root: string;
  topSection: string;
  nameBlock: string;
  name: string;
  coords: string;
  metaBlock: string;
  gamutLabel: string;
  gamutBox: string;
  gamutOn: string;
  gamutOff: string;
  gamutSeparator: string;
  apcaRow: string;
  apcaLabel: string;
  apcaValue: string;
  divider: string;
  bottomSection: string;
  dataBlock: string;
  dataRow: string;
  dataLabel: string;
  dataValue: string;
  contrastBlock: string;
  contrastStrip: string;
  contrastText: string;
}

export function colorCardClasses(
  _config: ColorCardConfig,
  _state: ColorCardState,
): ColorCardClassSet {
  return {
    root: 'w-full aspect-square rounded-xl flex flex-col justify-between overflow-hidden',
    topSection: 'flex justify-between items-start p-8',
    nameBlock: 'flex flex-col gap-1',
    name: 'text-title-large ts-title-large font-bold tracking-tight',
    coords: 'text-body-small ts-body-small opacity-50',
    metaBlock: 'flex flex-col items-end gap-1.5',
    gamutLabel: 'text-label-small ts-label-small tracking-widest uppercase opacity-50',
    gamutBox:
      'inline-flex items-center border border-current rounded-sm px-3 py-1 text-label-small ts-label-small',
    gamutOn: 'text-success',
    gamutOff: 'opacity-30',
    gamutSeparator: 'px-1.5 opacity-30',
    apcaRow: 'flex items-baseline gap-1.5',
    apcaLabel: 'text-label-small ts-label-small tracking-widest uppercase opacity-50',
    apcaValue: 'text-body-small ts-body-small',
    divider: 'mx-8 border-t border-current opacity-10',
    bottomSection: 'flex justify-between items-end p-8 pt-4',
    dataBlock: 'flex flex-col gap-2',
    dataRow: 'flex items-baseline gap-4',
    dataLabel: 'text-label-medium ts-label-medium font-semibold',
    dataValue: 'text-body-small ts-body-small opacity-70',
    contrastBlock: 'flex flex-col gap-1.5',
    contrastStrip: 'rounded-md px-6 py-2.5 w-40',
    contrastText: 'text-label-medium ts-label-medium text-center',
  };
}
