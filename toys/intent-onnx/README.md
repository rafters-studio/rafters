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

- **Examples work and zero-shot does not.** Described labels alone almost never recognised a why.
- **Why versus not-why holds up**, including with the sentence shape swapped.
- **Sorting into parts is the weak pass, not the easy one.** At 0.44 to 0.56 it is not usable, with
  only 1 to 8 examples per part. This reversed the prediction.
- **A bigger model buys little:** mpnet adds 0.04 on why versus not-why and is 4.7 times the size.
- **The model is small and the install is not.** The smallest model is 24 MB, and the process holds
  231 MB, but the `node_modules` for this toy is 376 MB. RSS for later models is inflated, because
  all models ran in one process, so only the first row's reading is clean.

## Limits

- One author wrote every clause and every label, so independence is not shown. Sean has not
  corrected the labels, and rafters' independent set had not arrived when these ran.
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
