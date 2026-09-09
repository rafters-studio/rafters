import { decodeHtmlEntities } from './decode-html-entities';

/** Undoes happy-dom's attribute entity-encoding on data-config so a bind
 *  can read it as JSON. */
export function decodeConfig(el: HTMLElement): void {
  const raw = el.getAttribute('data-config');
  if (raw) el.setAttribute('data-config', decodeHtmlEntities(raw));
}
