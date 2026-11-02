---
slug: create-liquidity
section: solana
order: 11
emoji: "◉"
title: Create Liquidity
desc: Create a Raydium pool for your token so people can trade it.
---

**Create Liquidity** opens a **Raydium CPMM** pool for your token paired with SOL or USDC.

## 📝 Steps

1. Open **Create Liquidity**.
2. Select your token and the **quote asset**: SOL or USDC (USDC works on mainnet only).
3. Enter how much of each side to deposit.
4. Check the **starting price** and **starting market cap** the form calculates.
5. Review fees and confirm in your wallet.

## 🧮 How the price is set

The starting price comes from the ratio of the two amounts you deposit. A bigger quote deposit means a higher starting price. Starting market cap equals total supply times starting price.

## 💸 Fees

- **0.05 SOL** DegenKit service fee, collected in a separate small transaction after the pool is created.
- Raydium's own pool creation fee, shown on the form.
- Network fees and rent.

:::tip Rehearse on Devnet
Create a test pool on Devnet first to see how price and amounts behave.
:::

## 📚 Read more

- [Creating a token vs adding liquidity](/blog/creating-a-token-vs-adding-liquidity/)
- [SOL or USDC: choosing your pair](/blog/sol-or-usdc-liquidity-pair/)
- [Price, market cap and FDV](/blog/market-cap-vs-fdv-explained/)
- [Getting listed on DEX Screener and CoinGecko](/blog/dexscreener-and-coingecko-listing/)
