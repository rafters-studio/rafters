import type { OKLCH } from '@rafters/shared';
import { createClassy } from '@rafters/ui/primitives/classy';
import { colorCardClasses } from './color-card.classes';

const classy = createClassy({ allowArbitrary: true });

function oklchToCss(c: OKLCH): string {
  return `oklch(${c.l} ${c.c} ${c.h})`;
}

export interface ColorCardProps {
  name: string;
  oklch: OKLCH;
  seed: OKLCH;
  srgb: boolean;
  p3: boolean;
  apca?: { onWhite: number; onBlack: number };
  perceptual?: { density: string; weight: number };
  atmospheric?: { role: string; temperature: string };
}

export function ColorCard({
  name,
  oklch,
  seed,
  srgb,
  p3,
  apca,
  perceptual,
  atmospheric,
}: ColorCardProps) {
  const classes = colorCardClasses({ name, oklch, srgb, p3, apca, perceptual, atmospheric }, {});
  const textColor =
    seed.l > 0.6
      ? oklchToCss({ l: 0.1, c: seed.c * 0.3, h: seed.h, alpha: 1 })
      : oklchToCss({ l: 0.95, c: seed.c * 0.1, h: seed.h, alpha: 1 });

  return (
    <div
      data-part="root"
      className={classy(classes.root)}
      style={{ backgroundColor: oklchToCss(oklch), color: textColor }}
    >
      <div data-part="top" className={classy(classes.topSection)}>
        <div className={classy(classes.nameBlock)}>
          <div data-part="name" className={classy(classes.name)}>
            {name}
          </div>
          <div data-part="coords" className={classy(classes.coords)}>
            (L={seed.l.toFixed(3)}, C={seed.c.toFixed(3)}, H={Math.round(seed.h)})
          </div>
        </div>
        <div className={classy(classes.metaBlock)}>
          <div className={classy(classes.gamutLabel)}>gamut</div>
          <div className={classy(classes.gamutBox)}>
            <span className={classy(srgb ? classes.gamutOn : classes.gamutOff)}>sRGB</span>
            <span className={classy(classes.gamutSeparator)}>|</span>
            <span className={classy(p3 ? classes.gamutOn : classes.gamutOff)}>P3</span>
          </div>
          {apca ? (
            <div className={classy(classes.apcaRow)}>
              <span className={classy(classes.apcaLabel)}>APCA:</span>
              <span className={classy(classes.apcaValue)}>
                ({apca.onWhite.toFixed(0)}/{apca.onBlack.toFixed(0)})
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <div className={classy(classes.divider)} />
        <div data-part="bottom" className={classy(classes.bottomSection)}>
          <div className={classy(classes.dataBlock)}>
            {perceptual ? (
              <div className={classy(classes.dataRow)}>
                <span className={classy(classes.dataLabel)}>Perceptual</span>
                <span className={classy(classes.dataValue)}>
                  {perceptual.density} {(perceptual.weight * 100).toFixed(0)}%
                </span>
              </div>
            ) : null}
            {atmospheric ? (
              <div className={classy(classes.dataRow)}>
                <span className={classy(classes.dataLabel)}>Atmospheric</span>
                <span className={classy(classes.dataValue)}>
                  {atmospheric.role}, {atmospheric.temperature}
                </span>
              </div>
            ) : null}
          </div>
          <div className={classy(classes.contrastBlock)}>
            <div
              className={classy(classes.contrastStrip)}
              style={{ backgroundColor: 'white', color: oklchToCss(oklch) }}
            >
              <div className={classy(classes.contrastText)}>on white</div>
            </div>
            <div
              className={classy(classes.contrastStrip)}
              style={{ backgroundColor: 'black', color: oklchToCss(oklch) }}
            >
              <div className={classy(classes.contrastText)}>on black</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ColorCard.displayName = 'ColorCard';
export default ColorCard;
