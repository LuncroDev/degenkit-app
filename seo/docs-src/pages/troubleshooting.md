---
slug: troubleshooting
section: ref
order: 3
emoji: "🛠️"
title: Troubleshooting
desc: Fixes for the most common problems: wallet not detected, wallet warnings, failed or stuck transactions.
---

## 👛 My wallet isn't detected

1. Refresh the page and unlock the extension.
2. Make sure the extension is enabled for this site.
3. Try another browser profile without conflicting wallet extensions.
4. See [Connect your wallet](/docs/wallets/).

## 🚨 My wallet shows a warning about the site

New domains are sometimes flagged automatically by wallet security lists. What to check:

- The address bar says exactly `degenkit.app`.
- You reached the site from our official links: [Official links](/docs/official-links/).

If you're unsure, don't sign. Contact us at support@degenkit.app with a screenshot. We submit review requests to wallet teams.

## ⏳ My transaction is stuck or says "confirmation timed out"

The transaction may still have gone through. **Check the mint address or signature on the explorer** before trying again, so you don't pay twice.

## ❌ My transaction failed

- **Not enough balance.** You need SOL (or ETH/BNB) for the service fee, network fee and rent.
- **Blockhash expired.** The network was busy. Try again.
- **Wallet rejected or closed.** Nothing was charged. Try again.

## 🪙 My token doesn't show in my wallet

Some wallets hide unknown tokens. Add it by its mint (Solana) or contract address (EVM), or look it up on the explorer.

## 📮 Still need help?

See [Support](/support/) and include the tool, network, wallet address and transaction signature. Never send a seed phrase.
