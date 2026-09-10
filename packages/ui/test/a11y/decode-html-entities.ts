/** happy-dom's innerHTML parser leaves character entity references encoded
 *  in attribute values; a real browser decodes them when parsing, so this
 *  undoes that encoding before a caller reads the attribute as JSON or text. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
