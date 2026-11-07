---
title: 'Crypto Liquidations Explained: How a Dip Becomes a Crash'
seo_title: 'Crypto Liquidations Explained: Dip to Crash'
slug: crypto-liquidations-explained
date: '2026-11-07'
excerpt: Crypto liquidations are forced closures of borrowed trades. How they work, why they cascade, and how $1.26 billion was wiped out in a day in November 2026.
cover: /blog/img/crypto-liquidations-explained-cover.webp
cover_alt: A glowing blue coin with a lightning bolt on a dark lit grid beside a headline about liquidations.
tags:
- Explainer
- News
---

Crypto liquidations are trades made with borrowed money that an exchange closes automatically when the price moves too far against them. Because each forced sale pushes the price further, liquidations can turn a normal dip into a crash, as on November 5, 2026, when about $1.26 billion was liquidated in 24 hours.

:::note Key facts
- A liquidation happens when losses on a leveraged trade use up the trader's own deposit.
- With **10x** leverage, a move of roughly **10%** against you is enough. With **50x**, about **2%**.
- About **$1.26 billion** was liquidated in 24 hours on November 5, 2026, about **$1.12 billion** of it from longs.
- Liquidations affect everyone's prices, even people who never use leverage.
:::

## What does liquidation mean in crypto?

Many exchanges let traders borrow to make bigger bets. This is called **leverage**. With 10x leverage, $1,000 of your own money controls a $10,000 position.

The borrowed part must stay protected. If the price moves against you far enough to use up your $1,000, the exchange **closes the position automatically**. That is a liquidation. You lose your deposit, and the exchange sells (for a bet on a rise, called a **long**) or buys (for a bet on a fall, called a **short**) to close the position.

Exchanges usually act a little before your deposit reaches zero. They keep a minimum balance called the **maintenance margin**, and fees reduce your cushion too.

## How much of a price move liquidates a position?

The higher the leverage, the smaller the move that wipes out your deposit. As a rough guide, before fees and maintenance margin:

| Leverage | Move against you that liquidates |
|---|---|
| 2x | about 50% |
| 5x | about 20% |
| 10x | about 10% |
| 25x | about 4% |
| 50x | about 2% |

Bitcoin fell 5.3% and Ether 7.2% on November 5, 2026. A long on Ether with more than about 14x leverage could have been liquidated by that move alone.

![How a liquidation cascade works, and how much of a move liquidates 2x, 10x and 50x leverage.](/blog/img/crypto-liquidations-explained-1.webp "Real thresholds are a little closer because of fees and maintenance margin.")

## How does a liquidation cascade work?

1. **Something pushes the price down.** A hack, a Fed decision or a stock sell-off.
2. **The most leveraged longs are liquidated.** The exchange sells their positions automatically.
3. **That selling pushes the price lower.** There may not be enough buyers to absorb it.
4. **The next group of longs hits its liquidation price,** and the cycle repeats.

Nobody chooses to sell in steps 2 to 4. It is mechanical, which is why prices can drop very fast and then bounce once the leverage is gone. The same thing happens upward with shorts, called a **short squeeze**.

## What happened in the November 2026 crash?

Three cascades hit within nine days:

- **October 29:** about **$628 million** was liquidated within an hour after the Binance hack, as Bitcoin fell below $79,000 ([CryptoTicker](https://cryptoticker.io/en/why-is-crypto-down-today-november-3-2026/)).
- **November 5:** about **$1.26 billion** in 24 hours as the Nasdaq fell 5.5%, about $1.12 billion of it longs ([crypto.news](https://crypto.news/bitcoin-price-today-rebounds-76000-etf-outflows/)).
- **November 6:** more than **$210 million** on ETH alone, $179 million of it longs. ETH open interest fell to about $11.4 billion, from about $16 billion in late September ([crypto.news](https://crypto.news/why-is-ethereum-price-down-today-eth-etf-liquidations)).

Open interest is the total size of open futures bets. When it falls, there is less leverage left to force out. For the full timeline, see [why crypto is crashing](/blog/crypto-crash-november-2026/).

![Liquidations during the November 2026 crash: $628 million in an hour on October 29, $1.26 billion in 24 hours on November 5 and $210 million on ETH on November 6.](/blog/img/crypto-liquidations-explained-2.webp "CoinGlass data via crypto.news and CryptoTicker.")

![The liquidation cascade in 20 seconds: leverage, a price drop, forced selling and a lower price, round after round.](/blog/img/crypto-liquidations-explained-demo.mp4)

## Why do liquidations matter if you never use leverage?

- **Your token's price moves with the market.** When Bitcoin and SOL fall fast, buyers of small tokens step back too.
- **Wicks trigger orders.** Cascades create short, sharp drops that can fill stop orders or move pool prices before a bounce.
- **Pool prices follow.** If your token is paired with SOL or ETH, a fast drop in that coin lowers your token's dollar value. See [SOL or USDC for your liquidity pair](/blog/sol-or-usdc-liquidity-pair/).

Creating a token or adding liquidity on DegenKit involves no leverage. Nothing you do there can be liquidated. Price impact in your own pool is a different thing, explained in [slippage vs price impact](/blog/slippage-vs-price-impact/).

## What are the risks of trading with leverage?

- **You can lose your whole deposit** in one fast move, even if the price recovers minutes later.
- **Funding fees** on perpetual futures can cost you while you wait.
- **Exchange risk.** During incidents, exchanges can pause withdrawals, as Binance did after the hack.

You can lose money in crypto. This is not financial advice.

## FAQ

### What does liquidated mean in crypto?

It means an exchange closed your leveraged trade automatically because your losses used up your deposit. You lose the deposit you put in.

### How do people get liquidated in crypto?

By using leverage. The higher the leverage, the smaller the price move that wipes out the deposit. At 10x, a move of about 10% is enough.

### What is liquidation in crypto lending?

On lending platforms, if your collateral falls in value below a set level, part of it is sold to repay the loan. The idea is the same: protect the lender when prices fall.

## Sources

- [crypto.news: Bitcoin price today and liquidations](https://crypto.news/bitcoin-price-today-rebounds-76000-etf-outflows/)
- [crypto.news: Why is Ethereum price down today](https://crypto.news/why-is-ethereum-price-down-today-eth-etf-liquidations)
- [CryptoTicker: Why is crypto down today, November 3, 2026](https://cryptoticker.io/en/why-is-crypto-down-today-november-3-2026/)
- [CoinGlass: Liquidation data](https://www.coinglass.com/LiquidationData)

If you want to build rather than trade, the [DegenKit token creator docs](/docs/token-creator/) explain how a token is made from your own wallet.
