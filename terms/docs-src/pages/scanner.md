---
slug: scanner
section: solana
order: 8
emoji: "◈"
title: Scanner
desc: Check any Solana token's authorities and holder concentration with a heuristic risk score.
---

Paste any Solana **token mint** to see:

- Whether mint and freeze authority are still active.
- How concentrated the holders are.
- A **heuristic risk score** based on those signals.

The Scanner is read-only and doesn't need a signature.

## ⚠️ What the score is not

The score is a quick signal, not a verdict. It does **not** verify liquidity locks, team allocations or off-chain intent. Always do your own research.

## 🧭 How to read it

- **Authorities active** means the creator can still change supply or freeze accounts.
- **Few wallets hold most of the supply** means a handful of people can move the price.

Read more in [How to spot rug pull risk](/blog/how-to-spot-rug-pull-risk/), [How to spot a honeypot token](/blog/how-to-spot-a-honeypot-token/) and [How to read a holder bubblemap](/blog/how-to-read-a-holder-bubblemap/).
