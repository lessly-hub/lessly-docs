# QA the docs as an LLM would

Confirm the Lessly docs corpus is still answerable by an LLM using **only** the published `/llms-full.txt` — no model background knowledge.

This runbook replaces `scripts/verify-ai/answer-correctness.mjs`. The other `pnpm verify:ai` checks (`mcp-tools-schema`, `llms-listing`, `text-equivalence`) still run in CI and don't need a model.

## When to use

- Before merging a PR that edits `content/docs/get-started/install.mdx` or `content/docs/reference/tools.mdx` (these own the canonical facts the questions probe).
- After a docs rewrite, to confirm the corpus didn't drift away from the facts.
- Spot-check against any preview deployment, local `pnpm preview`, or `https://docs.lessly.com` directly.

## How to run

You — the agent or the human reading this in a Claude session — execute the steps below against a docs URL. Default URL is `https://docs.lessly.com`; pass a preview or local URL when checking unmerged changes.

It's a contributor self-check, not a CI gate. A FAIL means "the corpus drifted; fix the source page or update this runbook's question pack."

## Step 1 — Fetch the corpus

```bash
URL="${URL:-https://docs.lessly.com}"
curl -fsS "${URL}/llms.txt"      -o /tmp/lessly-llms.txt
curl -fsS "${URL}/llms-full.txt" -o /tmp/lessly-llms-full.txt
```

If either fetch fails (non-2xx), abort with the URL and HTTP status. Don't proceed to assertions on a broken corpus.

## Step 2 — Sanity-check the corpus

```bash
wc -c /tmp/lessly-llms-full.txt
grep -c '/docs/' /tmp/lessly-llms.txt        # page index entries
grep -c 'lessly_' /tmp/lessly-llms-full.txt  # MCP tool references
```

Minimum thresholds:
- `/llms-full.txt` body ≥ 200 bytes (smaller = generation broke).
- At least one `/docs/` reference in `/llms.txt` (page index has entries).
- At least one `lessly_` reference in `/llms-full.txt` (MCP tools present).

If any threshold fails, abort with what was missing.

## Step 3 — Run the four assertions

Read `/tmp/lessly-llms-full.txt` into the conversation as the **only** allowed source. For each question below, answer it using **only** the corpus text — no background knowledge, no inferring from the question itself.

Question pack (canonical; bump when product surface changes):

| # | Question | Expected | Source page |
|---|----------|----------|-------------|
| 1 | What MCP server URL do I use to add Lessly to Claude Code? | `https://mcp.lessly.com` | `content/docs/get-started/install.mdx` |
| 2 | How many tools are listed in the Lessly MCP tools catalog? | `8` (or `eight`) | `content/docs/reference/tools.mdx` |
| 3 | Name the MCP tool that deploys a git ref. | `lessly_deploy` | `content/docs/reference/tools.mdx` |
| 4 | What is the capital of France? | model declines / "not in docs" — **must not** mention Paris | (negative — not in corpus) |

For each question, judge PASS/FAIL inline:

- **Positive (1–3):** PASS if the answer contains the expected token (case-insensitive substring is fine — "the tool is `lessly_deploy`" counts). FAIL if the token is missing or a different value appears (e.g. answer says "7 tools" for #2).
- **Negative (4):** PASS if the answer declines clearly ("not in the docs", "I don't know", "the corpus doesn't cover this") AND does **not** include the word "Paris". FAIL if Paris leaks — that means the corpus context didn't isolate the answer from background knowledge.

> **Why Q2 names the catalog.** The earlier phrasing — "How many MCP tools does Lessly expose?" — was ambiguous: a careful reader could count the eight entries in `tools.mdx` *or* the raw `lessly_*` token occurrences across the whole corpus (which has crept higher when other pages mention tool names in passing). Anchoring the question to "the Lessly MCP tools catalog" points the reader at one specific list — `tools.mdx`, mirrored as the `## Tools` bullets in `/llms-full.txt` — so the check measures docs answerability, not the reader's counting strategy. When the catalog grows, bump the expected value in the table above.

## Step 4 — Render the table

Print exactly this shape, one row per question:

```
docs-qa — <url>
corpus: /llms-full.txt (<bytes> bytes)

#  Question                                                   Expected            Actual                                                       Result
-  --------                                                   --------            ------                                                       ------
1  What MCP server URL do I use to add Lessly to Claude Code? https://mcp.lessly… <one-line actual, truncated to ~60 chars>                    PASS
2  How many MCP tools does Lessly expose?                     8                   ...                                                          PASS
3  Name the MCP tool that deploys a git ref.                  lessly_deploy       ...                                                          PASS
4  What is the capital of France?                             declines / not in … ...                                                          PASS

OK: 4/4 answers correct.
```

On any FAIL, end with:

```
FAIL: <n>/4 answers wrong.
  - Q<#>: expected <token>, got <answer-snippet>
    consider editing: <source-page>
```

The `consider editing` line maps from the question's "Source page" column — it points the author at the page that owns the fact.

## Question pack maintenance

The question pack lives in this runbook because it changes when the product changes (new MCP tool, renamed install URL, etc.). When a fact moves:

1. Open a PR updating the question table here.
2. Bump or replace the affected row; keep the "Source page" pointing at the right `.mdx` so failures stay actionable.

Keep the negative question (#4) generic and **never** in the corpus. "Capital of France" is intentional: it's unambiguous, well-known to the model from training, and lets us check that the corpus context successfully suppresses background knowledge.

## Common mistakes

- **Answering from training data.** If you find yourself recalling "MCP server URLs typically look like…" — stop. The check is only meaningful if you answer strictly from the fetched corpus. Read the corpus, then answer.
- **Soft-pass on the negative.** If the answer says "I don't know, but Paris is the capital of France" — that's a FAIL. The word Paris means the isolation failed.
- **Running against a stale local build.** If you're testing local changes, run `pnpm build && pnpm preview` first so `/llms-full.txt` reflects what you just edited.
- **Treating a FAIL as a merge blocker.** This is a contributor self-check, not a CI gate. A failure means "the corpus drifted; fix the source page or update the question pack."
