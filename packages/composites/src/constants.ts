/**
 * Shared recursion limit for nested composites.
 *
 * Both the composite serializer and the block instantiator cap how deep they
 * recurse into nested `composite:*` blocks. Deep nesting indicates misuse, so a
 * single conservative limit applies to both -- previously they diverged (50 vs
 * 10), which let a pathological composite serialize but not instantiate.
 */
export const COMPOSITE_MAX_DEPTH = 10;
