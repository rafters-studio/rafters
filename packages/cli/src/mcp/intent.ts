/**
 * The intent door (issue #2075).
 *
 * A second entrance to the intel graph, beside `describe`'s dot-address drill.
 * Where `describe('modal')` answers "tell me about this node," the intent door
 * answers a natural-language question -- "what do I use when it needs to be
 * above everything" -- by routing over a small, hand-curated intent-tag
 * vocabulary to a chosen node PLUS its near-miss counter-example: the node an
 * agent would plausibly have reached for and been wrong.
 *
 * The counter-example is the high-value half. It is computed from tag
 * proximity, never a hardcoded pair: the near-miss must share SOMETHING with
 * the winner (why you'd confuse them) while diverging on the tag that actually
 * decided the routing.
 *
 * Scope of this slice:
 *  - `INTENT_TAGS` is hand-curated here, decoupled from the registry/JSDoc. The
 *    real `@semantic-meaning` tag is a variant crib sheet, not routable intent
 *    prose, so extracting routing fuel from it returns nothing usable today.
 *    Migrating `INTENT_TAGS` to a JSDoc-extracted structured tag (mirroring the
 *    `@constraint` mechanism) is the named follow-up, not built here.
 *  - Query-to-tag matching is real substring/keyword matching, never an
 *    embedding. Embeddings are an explicit deferral.
 *  - `describe` (#2072) is imported and reused unmodified to resolve `use`/`not`
 *    to full layer-0 `NodeResult`s. This file never touches the address-drill
 *    path.
 */

import { describe, type Graph, type NodeResult } from './graph.js';

/** A single curated intent tag, e.g. `'blocking'` or `'above-all'`. */
export type IntentTag = string;

/** One routing axis: a query-side keyword set that resolves to a single tag. */
export interface IntentAxis {
  tag: IntentTag;
  /** Substrings tested against the lowercased query. All lowercase. */
  keywords: readonly string[];
}

/** A successful route: the node to use, its near-miss, and why they diverge. */
export interface IntentMatch {
  use: NodeResult;
  not: NodeResult;
  because: string;
}

/** No route (or no formable counter-example): a pointer back to browsing. */
export interface IntentNoMatch {
  note: string;
}

/**
 * Curated intent-tag vocabulary, per node id. NOT sourced from the registry or
 * JSDoc in this slice (see the file header for why). A small, fixed map,
 * decoupled from `RegistryItem` entirely.
 *
 * Curation rule: every node carries at least one tag it SHARES with another
 * (why they compete for the same question) and at least one that DISTINGUISHES
 * it (what decides the routing). `modal` and `alert` both answer "how do I get
 * attention," but diverge on blocking/above-all vs inline/passive -- that
 * divergence is exactly what makes `alert` a provable near-miss for `modal`.
 *
 * Declaration order is significant: it breaks scoring and near-miss ties.
 */
const INTENT_TAGS: Readonly<Record<string, readonly IntentTag[]>> = {
  modal: ['attention', 'blocking', 'above-all', 'focus-trap'],
  alert: ['attention', 'inline', 'passive'],
  tooltip: ['hint', 'passive', 'inline', 'hover'],
};

/**
 * Query-side keyword sets, one axis per tag. A phrase may appear on more than
 * one axis when it implies both: something "above everything" is also
 * "blocking," so that phrase lights up both tags and both become decisive.
 */
const INTENT_AXES: readonly IntentAxis[] = [
  {
    tag: 'above-all',
    keywords: [
      'above everything',
      'above all',
      'on top of everything',
      'sits on top',
      'on top',
      'over everything',
      'over all',
      'topmost',
      'highest layer',
    ],
  },
  {
    tag: 'blocking',
    keywords: [
      'above everything',
      'on top of everything',
      'over everything',
      'block',
      'blocking',
      'must dismiss',
      'interrupt',
      'take over',
      'stops everything',
      'requires a response',
      "can't ignore",
      'cannot ignore',
    ],
  },
  {
    tag: 'inline',
    keywords: ['inline', 'in place', 'in the flow', 'within the page', 'non-blocking'],
  },
  {
    tag: 'passive',
    keywords: ['passive', 'non-intrusive', 'subtle', 'quietly', 'in the background'],
  },
  {
    tag: 'attention',
    keywords: ['attention', 'notice', 'get noticed', 'important message'],
  },
  {
    tag: 'hint',
    keywords: ['hint', 'a tip', 'explain', 'extra info', 'more info'],
  },
  {
    tag: 'hover',
    keywords: ['hover', 'on hover', 'mouse over'],
  },
];

/**
 * True when `input` cannot be a dot-address: it contains whitespace, and no
 * valid dot-address does. The dispatcher (issue #2076) uses this to decide
 * whether to call `describe` or `matchIntent`. This slice does not wire it.
 */
export function isNaturalLanguageQuery(input: string): boolean {
  return input.includes(' ');
}

/**
 * Route a natural-language query to a node and its tag-proximity near-miss.
 * Never throws: an empty, nonsense, or no-route query returns `IntentNoMatch`,
 * as does a query that matches tags no in-graph node carries, or a match for
 * which no counter-example can be formed (the door only opens on the pair).
 */
export function matchIntent(query: string, graph: Graph): IntentMatch | IntentNoMatch {
  const normalized = query.toLowerCase();
  const matchedTags = collectMatchedTags(normalized);

  if (matchedTags.size === 0) return noMatch();

  const winner = selectUse(matchedTags, graph);
  if (winner === undefined) return noMatch();

  const winningTags = winner.tags.filter((tag) => matchedTags.has(tag));
  const decisive = new Set(winningTags);

  const nearMiss = selectNearMiss(winner, decisive, matchedTags, graph);
  if (nearMiss === undefined) return noMatch();

  const use = describeNode(winner.id, graph);
  const not = describeNode(nearMiss.id, graph);
  if (use === undefined || not === undefined) return noMatch();

  const divergingTags = nearMiss.tags.filter((tag) => !winner.tags.includes(tag));
  const because = `${winner.id} is ${winningTags.join('/')}; ${nearMiss.id} is ${divergingTags.join('/')}`;

  return { use, not, because };
}

/** The set of tags whose axis has a keyword substring present in the query. */
function collectMatchedTags(normalizedQuery: string): Set<IntentTag> {
  const matched = new Set<IntentTag>();
  for (const axis of INTENT_AXES) {
    for (const keyword of axis.keywords) {
      if (normalizedQuery.includes(keyword)) {
        matched.add(axis.tag);
        break;
      }
    }
  }
  return matched;
}

interface ScoredNode {
  id: string;
  tags: readonly IntentTag[];
}

/**
 * The in-graph node with the highest count of tags in `matchedTags`, ties
 * broken by declaration order. Returns undefined when no node scores above zero
 * (a matched tag that no in-graph node carries falls through here).
 */
function selectUse(matchedTags: ReadonlySet<IntentTag>, graph: Graph): ScoredNode | undefined {
  let best: ScoredNode | undefined;
  let bestScore = 0;
  for (const [id, tags] of Object.entries(INTENT_TAGS)) {
    if (!graph.nodes.has(id)) continue;
    const score = tags.reduce((sum, tag) => (matchedTags.has(tag) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      best = { id, tags };
    }
  }
  return best;
}

/**
 * The near-miss counter-example, from tag PROXIMITY, not the runner-up score.
 * A candidate must (a) share at least one tag with `use` OUTSIDE `matchedTags`
 * -- the "you'd plausibly confuse these" signal -- and (b) carry NONE of the
 * decisive tags that actually won the routing. Among candidates, the one with
 * the highest overall tag overlap with `use` wins, ties by declaration order.
 */
function selectNearMiss(
  use: ScoredNode,
  decisive: ReadonlySet<IntentTag>,
  matchedTags: ReadonlySet<IntentTag>,
  graph: Graph,
): ScoredNode | undefined {
  let best: ScoredNode | undefined;
  let bestOverlap = 0;
  for (const [id, tags] of Object.entries(INTENT_TAGS)) {
    if (id === use.id || !graph.nodes.has(id)) continue;
    if (tags.some((tag) => decisive.has(tag))) continue; // matched a decisive tag -> not a near-miss

    const overlap = tags.filter((tag) => use.tags.includes(tag));
    const sharesOutsideMatched = overlap.some((tag) => !matchedTags.has(tag));
    if (!sharesOutsideMatched) continue; // no proximity signal

    if (overlap.length > bestOverlap) {
      bestOverlap = overlap.length;
      best = { id, tags };
    }
  }
  return best;
}

/** Resolve an id to its #2072 layer-0 NodeResult, or undefined if not a node. */
function describeNode(id: string, graph: Graph): NodeResult | undefined {
  const result = describe(id, graph);
  if (!Array.isArray(result) && 'children' in result) return result;
  return undefined;
}

function noMatch(): IntentNoMatch {
  return { note: 'no route matched; describe(components) or describe(composites) to browse' };
}
