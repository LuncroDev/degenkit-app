# DegenKit Blog Standards (v2, 7 Nov 2026)

Every post must let a reader who typed one specific query into Google (or asked ChatGPT) leave with the exact answer. If a post cannot be summed up as "the answer to the question X", it does not get published.

## 1. Before writing: the brief (required)
Fill this in first. A post without a complete brief is not started.

| Field | Rule |
|---|---|
| Primary keyword | One exact phrase a person types. Taken from the keyword plan (Semrush). |
| Search intent | Exactly one: **Answer** (what is X), **How-to** (do X step by step), **Compare** (X vs Y), **Check** (is X safe / how to verify), **Cost/Choose**. |
| Reader | One sentence: who is searching and what they have in hand (e.g. "first-time creator with a Phantom wallet and 0.5 SOL"). |
| The answer | The reader's question answered in 1–2 sentences. This becomes the opening. |
| Target page | The /launch/, /tools/ or /docs/ page this post supports. |
| Sources | 2+ real, public sources (official docs, explorers, announcements). No source = no factual claim. |
| Overlap check | Search `posts/` for the keyword. If a post already targets it, update that post instead. |

## 2. Metadata (checked by lint.py)
- `title`: 40–70 chars, primary keyword within the first 40 chars, plain words, no clickbait, no year unless it is genuinely dated.
- `seo_title`: required if title would exceed 70 chars with " | DegenKit Blog". ≤ 54 chars.
- `excerpt` (= meta description): **110–175 chars**, contains the keyword once, states what the reader gets. No "In this post we will".
- `slug`: lowercase, hyphens, keyword words only, no dates (except news posts), no stop-word padding.
- `date`: real publish date. `tags`: 2–3 from the fixed list (§9).
- `cover` + `cover_alt`: alt describes the image literally, 8+ words, no keyword stuffing.

## 3. Structure (the "answer-first" pattern)
1. **Opening (max 70 words)**: sentence 1 answers the query directly. Sentence 2 says who it applies to or the key caveat. No history, no hype, no "In the world of crypto…".
2. **Key facts box** right after the opening: a `:::note` with 3–5 bullets (the essentials: cost, time, chain, risk). This is what search engines and AI assistants quote.
3. **Body: 3–8 `##` sections**, each section = one question. Headings are phrased as the question or the task ("How much does it cost?", "Step 3: Revoke mint authority"). One idea per section, 80–220 words.
4. **Steps**: numbered list, one action per step, exact UI labels in **bold**, expected result stated.
5. **Compare posts**: a table with identical rows for each option, then a "Choose X if… / Choose Y if…" verdict.
6. **Risks and limits** section in every post that involves money, keys or contracts.
7. **FAQ** (`## FAQ`): 3–5 real questions with 1–3 sentence answers. Use questions from the keyword tool (People Also Ask / phrase_questions), not invented ones.
8. **Sources** list at the end with titles and URLs (external, authoritative).
9. **Next step**: one sentence + link to the relevant DegenKit page. Not a sales pitch.

## 4. Length and depth
- Minimum 700 words, target 900–1,300, hard ceiling 1,800. Longer = split into two posts.
- Every paragraph ≤ 4 sentences. Every sentence carries a fact, a step or a decision.
- Cut filler: if a sentence can be removed without losing information, remove it.

## 5. Accuracy rules (non-negotiable)
- Numbers (fees, limits, addresses, chain IDs) must come from a source or from our own live config, and be dated if they can change ("as of Nov 2026").
- Never state a third-party fact we cannot source. Use "as far as we know" or leave it out.
- No price predictions, no "will go up/pump", no buy/sell calls, no guaranteed outcomes.
- Say what DegenKit does and does not do. Never claim audits, partnerships, listings or integrations we do not have.
- Third parties (Pons, Robinhood, Phantom, pump.fun, Uniswap…): neutral tone, no affiliation implied. Posts naming Pons carry the "Not affiliated" note.
- No fabricated quotes, statistics, reviews or screenshots.
- Re-verify any post older than 90 days that contains fees or UI steps.

## 6. Tone
Plain, direct, calm. Short words. Active voice. "You" for the reader. Explain a term the first time it appears. Never mock readers who lost money. No emojis. No exclamation marks. No slang ("degen", "ape in") except in the brand name.

**Banned phrases** (lint fails): guaranteed, 100x, moonshot, to the moon, get rich, risk-free, passive income, easy money, game-changer, revolutionary, unlock the power, in today's fast-paced, delve, "you should buy".

## 7. Links
- ≥ 3 distinct internal links, at least one to a /launch/, /tools/ or /docs/ page; link text describes the target ("the token scanner", not "click here").
- ≥ 1 external authoritative link (official docs, explorer, announcement). External links open as normal links; no affiliate links.
- Link a new post FROM two older relevant posts the day it ships.

## 8. Images and video
- Cover required (16:9 webp). In-body image only when it explains something; alt text 8+ words describing what it shows.
- Motion video = short loop (.mp4) supporting the post, never the only place an answer lives.

## 9. Tags (fixed list)
Solana, Ethereum, Robinhood Chain, BNB Chain, Base, Guide, Security, Tools, Launchpads, Explainer, News. Use 2–3.

## 10. Post types and what each must contain
| Type | Must contain |
|---|---|
| Explainer ("What is X") | Definition in the opening, how it works, example, risks, FAQ |
| How-to | Prerequisites list, numbered steps with results, common errors, cost/time, FAQ |
| Comparison | Table, verdict by reader type, what we do not know, sources |
| Safety/Check | Checklist, what each check means and its limits, "what this cannot tell you" |
| News/market | Date, what happened (sourced), what it means for creators, no predictions. Expires: mark for review at 30 days |

## 11. Publish checklist
1. Brief complete and primary keyword unique.
2. `python3 blog-src/lint.py <slug>` → zero ERRORs.
3. Opening answers the query in 2 sentences.
4. Every number/claim has a source.
5. Two older posts link to the new one.
6. Build, open the page, check title, meta, headings, mobile view.
7. Submit URL in Search Console, then add the tweet + video.
8. Add keyword to Semrush Position Tracking.

## 12. Maintenance
- Monthly: check Position Tracking; posts ranking 8–20 get an update (answer sharper, FAQ expanded, links added).
- Quarterly: re-verify fees, UI steps and sources; update `date` only when content truly changed.
- Existing posts below the standard (see `python3 blog-src/lint.py`) are upgraded in priority order: those with most impressions first.
