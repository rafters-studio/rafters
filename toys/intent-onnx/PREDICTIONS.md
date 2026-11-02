# Predictions: can a small local model pull the why out of an intent?

Written before any model ran. `controls.json` holds 20 intents and their labels, written by
veneer before any model ran, so the labels are one agent's reading until Sean corrects them.
A clause marked `feel` ("it should feel warm") is labelled a what, because Sean has not yet
said whether a feel is a why. Scores are given with and without those clauses.

The job has two passes. Pass 1 labels each clause why or not. Pass 2 sends each what and how
to a part of the system (colour, type, spacing, motion, radius, shadow, depth, none). The
model only labels: it writes nothing and picks no values.

Two kinds of mistake are not equal. A what that lands in the intent corrupts it. A why that
gets sorted away loses the designer's reason, which is worse, though they would see it missing
on read-back. Both are reported.

## Methods

- **zero-shot**: an NLI model scores each clause against written descriptions of the labels.
  It needs no examples.
- **examples**: an embedding model compares each clause with labelled clauses from the other
  19 intents, never its own. This is what a shipped model could do with a built-in example set.

## Predictions

1. Why versus not-why, best method, exact clause labels: 0.80 accuracy. Confidence 0.6.
2. Examples beats zero-shot on why versus not-why. Confidence 0.7.
3. Sorting into parts is easier than why versus not-why: at least 0.10 higher accuracy on the
   best method. Confidence 0.6.
4. What versus how is the weakest split, under 0.70. Confidence 0.65.
5. Why clauses naming a feeling ("feel they will not make an expensive mistake") get confused
   with `feel` clauses. Confidence 0.7.
6. A whole intent comes back entirely right (every clause on the correct side) for at most 8
   of 20. Confidence 0.6.
7. C16 and C17 (why only) return everything; C18, C19 and C20 (no why) return nothing, on at
   most 3 of those 5 for the best method. Confidence 0.5.
8. The smallest usable model is under 40 MB on disk, runs a clause in under 30 ms after loading,
   and the process holds under 400 MB. Confidence 0.6.
9. Bigger models help by less than 0.05 accuracy. Confidence 0.5.
