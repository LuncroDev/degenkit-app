---
slug: fees
section: ref
order: 1
emoji: "💸"
title: Fees
desc: Every DegenKit service fee per tool, plus the network costs you also pay.
---

Every action has two parts: DegenKit's **service fee** and the **network fee** that the blockchain charges. The service fee is always shown before you sign.

## ◎ Solana service fees

| Tool | Service fee |
|---|---|
| ◆ Token Creator | 0.28 SOL |
| ⚷ Revoke mint or freeze authority | 0.05 SOL each |
| ✎ Update Metadata | 0.05 SOL |
| 🔥 Burn Token | 0.02 SOL |
| ✈ Airdrop | 0.02 SOL per batch |
| ⇉ Multisender | 0.02 SOL per batch |
| ⇄ Swap | 0.01 SOL |
| ◉ Create Liquidity | 0.05 SOL (plus Raydium's pool creation fee) |
| ◎ Remove Liquidity | 0.02 SOL |
| ◈ Scanner, ✦ Vanity, ▤ My Tokens | Free |

:::note
Fees can be updated. The amount on the page when you sign is the amount that applies.
:::

## ⬡ EVM service fees

On Ethereum, BNB Chain, Base and Robinhood Chain, each creator (Token Creator and Tax Token) has a service fee stored in its **factory contract**. DegenKit reads it from the contract and shows it on the form before you sign.

## ⛓️ Network fees

- **Solana:** tiny network fees, plus a small refundable-style **rent** for new accounts.
- **EVM chains:** gas, paid in ETH or BNB. Gas varies with congestion. Ethereum is usually the most expensive.

Read more: [Solana fees and rent explained](/blog/solana-fees-and-rent-explained/), [Ethereum gas fees](/blog/ethereum-gas-fees-explained/), [DegenKit fees explained](/blog/degenkit-fees-explained/), [What a launch costs on each network](/blog/token-launch-costs-by-network/).

## 🎁 Free wallets

Some wallets on DegenKit's free list pay no service fee for token creation. Network fees still apply.
