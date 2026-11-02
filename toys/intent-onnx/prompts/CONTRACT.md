# Intent split endpoint

For platform. Route names, model choice and hosting are platform's. This states what the endpoint must do.

## Request and response

Request: `{"text": string}`.

Response: `{"clauses": [{"t": string, "l": "why" | "what" | "how", "p": string}]}`, where `p` is `none` on a why.

Run `split.md` as the system prompt with the text as the user message. One model call per request, with no conversation and no follow-up turn. The questions a designer answers after the split are fixed text and need no model.

## What the server must check, because a small model will not always obey

- The output parses as the shape above.
- Every clause's `t` appears word for word in the request's text, ignoring surrounding whitespace.
- Every `l` and `p` is one of the allowed values.

If any check fails, return `{"clauses": null}` with no retry. The caller saves the intent as written, with nothing split. Never return a repaired or partly checked result.

## Limits

- Text over 2,000 characters is refused.
- A hard monthly spend cap. Past it, return `{"clauses": null}`.
- A rate limit per client.
- Identical text returns a cached answer, with no model call.

The response only ever holds the caller's own words and labels, so the endpoint is useless as free model access. Keep it that way.

## Privacy

An intent can describe a client's unannounced project. Do not log or keep the text unless the designer has explicitly agreed. Corrections kept for training are also opt-in.

## Cost

Record input and output tokens per call from the first test. Set `max_tokens` from what the longest allowed text needs, and report the real cost per request before launch.

## How we will judge it

`score.mjs` scores a run of the 40 intents in this folder against the labels here. Workers AI models are not the Haiku the earlier runs used, so no earlier score carries over. Which model to use is decided by this test.
