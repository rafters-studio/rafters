import { resolveFillName } from '../../primitives/fill-resolver';
import type { CardConfig, CardState } from './card.behavior';

export interface CardClassSet {
  root: string;
  header: string;
  title: string;
  description: string;
  content: string;
  footer: string;
}

/**
 * Ported verbatim from the oracle (src/old/ui/card.classes.ts) -- these
 * tokens already carry the surface/typography roles the port needs
 * (`bg-card`/`text-card-foreground`/`border-card-border` also anchor
 * dialog.classes.ts's content surface; `text-title-medium`/`text-body-small`
 * also anchor dialog's title/description -- proven token pairings, not
 * agent invention).
 */
const rootClasses = 'bg-card text-card-foreground border border-card-border rounded-lg shadow-sm';

const headerClasses = 'flex flex-col gap-1.5 p-6';

const titleClasses = 'text-title-medium leading-none';

const descriptionClasses = 'text-body-small text-muted-foreground';

const contentClasses = 'p-6 pt-0';

const footerClasses = 'flex items-center p-6 pt-0';

export function cardClasses(config: CardConfig, _state: CardState): CardClassSet {
  const fillClasses = config.fill ? resolveFillName(config.fill, 'surface') : '';
  return {
    root: [rootClasses, fillClasses].filter(Boolean).join(' '),
    header: headerClasses,
    title: titleClasses,
    description: descriptionClasses,
    content: contentClasses,
    footer: footerClasses,
  };
}
