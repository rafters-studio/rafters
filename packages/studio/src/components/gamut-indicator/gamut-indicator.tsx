import { Badge } from '@rafters/ui/components/ui/badge';
import classy from '@rafters/ui/primitives/classy';
import type { OKLCH } from '@rafters/shared';
import { isInSRGBGamut, isInP3Gamut } from '@rafters/color-utils';
import { gamutIndicatorClasses } from './gamut-indicator.classes';

export interface GamutIndicatorProps {
  color: OKLCH;
}

export function GamutIndicator({ color }: GamutIndicatorProps) {
  const classes = gamutIndicatorClasses({ tier: 'srgb' }, {});
  const srgbOn = isInSRGBGamut(color);
  const p3On = !srgbOn && isInP3Gamut(color);
  return (
    <Badge variant="outline">
      <span className={classy(srgbOn ? classes.on : classes.off)}>sRGB</span>
      <span className={classy(classes.separator)}>|</span>
      <span className={classy(p3On ? classes.on : classes.off)}>P3</span>
    </Badge>
  );
}

GamutIndicator.displayName = 'GamutIndicator';
export default GamutIndicator;
