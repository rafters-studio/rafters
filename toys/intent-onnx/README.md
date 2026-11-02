# Intent ONNX toy

Can a small local model pull the why out of what a designer writes, and sort the rest into parts
of the system? It labels clauses only. It writes nothing and picks no values. `PREDICTIONS.md` was
written before each run.

## Rerun

```sh
pnpm install --ignore-workspace
node run.mjs controls.json > out-controls.jsonl      # each intent tested against the other 19
node style.mjs style-swap.json > out-style.jsonl     # trained on controls, tested on swapped style
```

Models download to `./models`. Run on an Apple M-series machine, `@huggingface/transformers` 3.7.5,
q8 quantized models.

## The answer

**A small local model or classic ML, no. A cheap hosted model, promising.** A Haiku-class model given
rafters' 70 clauses blind scored 0.843 against the 0.757 baseline. It removed all 17 whats and hows,
and kept 42 of 53 whys. Its misses all went one way, and several are clauses a person could label
either way, such as "readable from a phone in a glove". That direction suits a tool with one-click
correction, because a why sorted away is visible and a what left in the intent is not.

Limits on that result: one run; veneer wrote both the labels and the definition the model was given,
so they are not independent; it ran as a subagent, not through a bare API call; cost was not measured;
and the clauses were split by hand from agent writing. Human writing is still untested. Saved in
`out-hosted-haiku.json`.

Classic ML (`classic.py`, word and character n-grams, 65 to 239 KB) scored 0.60 to 0.73, removing 2 to 4
of 17 with both authors. About 150 labelled clauses is too few for it; more compute would not change that.

**The definition moves the score more than the model does.** Haiku on raw text, given only Sean's
words for the definition (`out-raw-split-haiku.json`, `node score.mjs`): 0.643 on rafters' clauses,
keeping 30 of 53 whys and removing 15 of 17, and 0.975 on the controls. It labelled most "the tracker
should celebrate showing up" clauses a how, where veneer labelled them a why. Sorting into parts
scored 0.91 on the controls, far above the embeddings' 0.56. All 159 clauses kept the writer's exact
words. Whether those clauses are whys is Sean's call, and it decides what the prompts should say.

**Cold writing: huttspawn's 20, with no definition or examples, through `prompts/split.md` and
`prompts/route.md` on Haiku** (`out-cold-haiku.json`, `node score-cold.mjs`). Scored as predicted: 0.664
with the disputed clauses as why, 0.764 without them, 0.776 with them as not-why. All 148 clauses kept the
writer's words. Most of the misses are an artefact of matching clauses by shared words: Haiku split
opening lines such as "A guide | for someone who has just lost a spouse", a finer split than the hand
labels, and the scorer then counts the whole line as a why. Excluding those is a reading made after
seeing the results, not a score. Of the 18 disputed clauses, Haiku called 15 not-why, although
`split.md` tells it to prefer why when unsure.

**Small local embedding models fail too.** On intents another author wrote, every model scored below simply calling
everything a why. The high scores on the controls below came from one author writing both the test
and the examples. Read the controls table with that in mind.

| Model | Why vs not, rafters' intents (baseline 0.757) | Why kept | Not-why removed | Same, trained on both authors | Why kept | Not-why removed |
|---|---|---|---|---|---|---|
| all-MiniLM-L6-v2 | 0.600 | 0.755 | 0.118 | 0.686 | 0.868 | 0.118 |
| bge-small-en-v1.5 | 0.700 | 0.774 | 0.471 | 0.700 | 0.830 | 0.294 |
| all-mpnet-base-v2 | 0.729 | 0.868 | 0.294 | 0.729 | 0.887 | 0.235 |

Rafters' 70 clauses hold 53 whys and 17 whats and hows. Most of those 17 stayed in the intent, so the
models mostly fail at the job this exists for. More examples from the other author did not fix it,
which points at the method and not only the data: nearest neighbours on these embeddings follow
topic and shape, and a what written as a purpose ("show what is in season and who has it today")
looks like a why.

Rerun with `node style.mjs rafters-labelled.json` and `node mixed.mjs`. Rafters wrote its intents
without seeing the controls; veneer split and labelled them, and some labels are judgment calls.

## Results on the 20 controls (79 clauses)

| Model | Method | Why vs not | Why kept | Not-why removed | Parts | Intents fully right | Disk | Per clause |
|---|---|---|---|---|---|---|---|---|
| all-MiniLM-L6-v2 | examples | 0.924 | 0.941 | 0.911 | 0.556 | 14 | 24 MB | 1.5 ms |
| bge-small-en-v1.5 | examples | 0.937 | 0.941 | 0.933 | 0.556 | 15 | 35 MB | 2.3 ms |
| all-mpnet-base-v2 | examples | 0.962 | 0.941 | 0.978 | 0.444 | 17 | 111 MB | 7.3 ms |
| mobilebert-uncased-mnli | zero-shot | 0.570 | 0.000 | 1.000 | 0.378 | 3 | 28 MB | 76 ms |
| nli-deberta-v3-small | zero-shot | 0.671 | 0.235 | 1.000 | 0.156 | 3 | 181 MB | 110 ms |

Style swap (22 clauses, labels kept, shape swapped so whys are terse and whats talk about people):

| Model | Why vs not | Why kept | Not-why removed |
|---|---|---|---|
| all-MiniLM-L6-v2 | 0.909 | 1.000 | 0.833 |
| bge-small-en-v1.5 | 0.864 | 0.900 | 0.833 |
| all-mpnet-base-v2 | 0.909 | 0.900 | 0.917 |

## What it showed

- **Zero-shot does not work.** Described labels alone almost never recognised a why.
- **Why versus not-why held up only for one author**, including with the sentence shape swapped. It did not survive a second author.
- **Sorting into parts is the weak pass, not the easy one.** At 0.44 to 0.56 it is not usable, with
  only 1 to 8 examples per part. This reversed the prediction.
- **A bigger model buys little:** mpnet adds 0.04 on why versus not-why and is 4.7 times the size.
- **The model is small and the install is not.** The smallest model is 24 MB, and the process holds
  231 MB, but the `node_modules` for this toy is 376 MB. RSS for later models is inflated, because
  all models ran in one process, so only the first row's reading is clean.

## Limits

- Veneer wrote or assigned every label, and Sean has not corrected them. The 17 not-why clauses in
  rafters' set are few, so these scores are rough.
- 79 and 22 clauses. A difference of one clause moves the style-swap score by 0.045.
- Clauses are split by hand. Splitting raw text was not tested.
- `feel` clauses are labelled what, pending Sean's answer.

## Predictions against results

| # | Prediction | Result |
|---|---|---|
| 1 | Best why versus not-why is about 0.80 | Beat it: 0.962 |
| 2 | Examples beat zero-shot | Held |
| 3 | Parts easier than why versus not-why | Wrong: much harder |
| 4 | What versus how under 0.70 | Wrong: 0.80 to 0.84 |
| 5 | Why clauses naming a feeling get confused with `feel` clauses | Not supported: one or no `feel` clauses went to why |
| 6 | At most 8 of 20 intents fully right | Wrong: 14 to 17 |
| 7 | At most 3 of the 5 why-only and no-why intents right | Wrong: 4 or 5 |
| 8 | Under 40 MB, 30 ms, 400 MB | Held for the model; the install is far larger |
| 9 | Bigger models add under 0.05 | Held |
| 10 | Style swap falls to 0.70 or lower | Wrong: 0.864 to 0.909 |
| 11 | On rafters' set, why kept at least 0.80 and not-why removed at most 0.50 | Half: removed held at 0.118 to 0.471; only mpnet kept 0.80 |
| 12 | Mixed training reaches 0.80 on some model; not-why removed stays under 0.60 | First half wrong, best 0.729; second held |
| 13 | Classic on controls stays below baseline, removing at most half | Accuracy held; word logistic regression removed 10 of 17 |
| 14 | Classic with both authors reaches 0.75 to 0.82, removing at least 8 of 17 | Wrong: 0.67 to 0.73, removing 2 to 4 |
| 15 | Classic weights under 1 MB | Held: 65 to 239 KB |
| 16 | Hosted model reaches 0.80, removing at least 10 of 17 | Held: 0.843, removing 17 |
| 17 | Raw split on rafters' clauses stays at 0.75, removing at least 12 | Accuracy wrong: 0.643; removed 15 |
| 18 | Raw split on controls at least 0.85 | Held: 0.975 |
| 19 | Parts reach 0.70 | Held: 0.91 |
| 20 | At least 90% of clauses word for word | Held: 159 of 159 |
| 21 | Cold, without disputed clauses, at least 0.80, removing at least 80% | Wrong as scored: 0.764, removing 69%; scorer artefact noted above |
| 22 | Cold, disputed as why, why kept at least 0.75 | Wrong: 31 of 49 |
