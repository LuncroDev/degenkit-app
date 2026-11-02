---
slug: tax-token
section: evm
order: 2
emoji: "%"
title: Tax Token
desc: Create an ERC-20 with your own buy and sell tax, and manage it later.
---

A **Tax Token** takes a percentage of each trade and sends it, in the token itself, to a wallet you choose.

## ⚙️ Settings

| Setting | What it does |
|---|---|
| **Buy tax** | Percentage taken when someone buys |
| **Sell tax** | Percentage taken when someone sells |
| **Tax receiver** | The wallet that receives the tax |

Rates can be anything from 0 to 100%. Rates above **10%** make buyers wary.

## 🔄 How the tax applies

- Tax applies **only** to trades against a liquidity pool you mark.
- Normal wallet-to-wallet transfers are **never** taxed.
- Tax starts working **after** you add liquidity and mark the pool address.

## 🛠️ Managing it later

Open **My Tokens** to:

- Change the buy and sell rates.
- Change the tax receiver.
- Mark the pool address.
- **Renounce ownership** to freeze the settings forever.

## 🔒 What it doesn't have

No mint function, no blacklist, no pause and no trading switch.

:::note
Read the full explanation in [How buy and sell tax works](/blog/how-token-buy-sell-tax-works/) and [Managing a tax token](/blog/manage-tax-token-renounce-ownership/).
:::
