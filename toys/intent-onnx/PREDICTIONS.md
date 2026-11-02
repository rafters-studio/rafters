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

## Added after the first run, before the style test ran

The first run scored 0.92 to 0.96 on why versus not-why with examples. The same author wrote
every clause: whys talk about people in full sentences, whats are terse commands. The models
may be learning that shape, not the meaning. `style-swap.json` keeps the labels and swaps the
shape: terse whys, and whats and hows that talk about people in full sentences.

10. Why versus not-why falls to 0.70 or lower on the style swap for all three embedding
    models. Confidence 0.75.

## Added before the rafters test ran

Rafters wrote 20 intents without seeing the controls. Veneer split them into clauses by hand and
labelled them in `rafters-labelled.json` before any model saw them. They are a different author
and a harder shape: long sentences, and whats written as purposes. Most clauses are whys, so a
model that calls everything a why scores high on accuracy alone; why kept and not-why removed
are the scores that count.

11. Why kept is at least 0.80, and not-why removed falls to 0.50 or lower, on all three embedding
    models. Confidence 0.65.

## Added after the rafters test, before the mixed test ran

On rafters' intents all three models scored below the 0.757 from calling everything a why. The
mixed test asks whether that is too few examples or the method. It holds out each tenth of rafters'
clauses in turn and trains on the controls plus the other nine tenths.

12. Why versus not-why reaches 0.80 or better on at least one model, and not-why removed stays
    under 0.60 on all three. Confidence 0.55.

## Added before the classic ML test ran

Word and character n-grams with logistic regression and a linear SVM: no embeddings, no runtime,
weights small enough to ship as a data file. Tested on rafters' clauses, trained on the controls,
then on the controls plus nine tenths of rafters' clauses. Fewer than 150 labelled clauses is far
below what this method usually needs, so this is a floor, not a verdict.

13. Trained on the controls alone, no classifier beats the 0.757 baseline, and not-why removed
    stays at or under 0.50. Confidence 0.7.
14. With both authors, the best classifier reaches 0.75 to 0.82 and removes at least 8 of the 17
    whats and hows. Confidence 0.5.
15. The saved weights are under 1 MB. Confidence 0.9.
