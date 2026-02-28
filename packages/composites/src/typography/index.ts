/**
 * Typography composite blocks
 *
 * Heading, Paragraph, Blockquote, and List composites for the block editor.
 * Auto-registers all typography composites with the registry on import.
 */

export { blockquoteComposite } from './blockquote.js';
export { headingComposite } from './heading.js';
export { listComposite } from './list.js';
export { paragraphComposite } from './paragraph.js';

// Auto-register all typography composites
import { register } from '../registry.js';
import { blockquoteComposite } from './blockquote.js';
import { headingComposite } from './heading.js';
import { listComposite } from './list.js';
import { paragraphComposite } from './paragraph.js';

register(headingComposite);
register(paragraphComposite);
register(blockquoteComposite);
register(listComposite);
