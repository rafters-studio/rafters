/**
 * Studio error codes (#2876): every refusal from rafters studio's
 * /__rafters/set and /__rafters/tokens names exactly one of these, so Studio
 * and any agent writing through the endpoint can respond without parsing the
 * message. The CLI README's Studio section gives each code's status, details
 * and the response Studio should make.
 */
export const STUDIO_ERROR_CODES = [
  'method-not-allowed',
  'origin-refused',
  'unsupported-media-type',
  'body-not-json',
  'body-invalid',
  'reason-required',
  'unknown-token',
  'token-invalid',
  'literal-color',
  'name-rejected',
  'name-taken',
  'token-in-use',
  'token-undeletable',
  'circular-dependency',
  'nothing-to-undo',
  'color-out-of-gamut',
  'internal',
] as const;

export type StudioErrorCode = (typeof STUDIO_ERROR_CODES)[number];
