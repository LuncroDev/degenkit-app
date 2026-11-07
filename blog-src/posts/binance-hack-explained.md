---
title: 'Binance Hack 2026: What Happened and How It Worked'
slug: binance-hack-explained
date: '2026-11-07'
excerpt: The Binance hack of October 29, 2026 drained hot wallets on 11 chains in about three hours. How it worked, where the funds went and what to check in your wallet.
cover: /blog/img/binance-hack-explained-cover.webp
cover_alt: A glowing amber coin with a cracked shield on a dark lit grid beside a headline about the Binance hack.
tags:
- News
- Security
---

The Binance hack on October 29, 2026 drained the exchange's hot wallets on 11 blockchains in about three hours, using Binance's own signing systems rather than stolen private keys. Elliptic counts $6.43 billion stolen and Binance estimates about $6.3 billion, the largest theft in crypto history. Binance says it will cover all customer losses.

:::note Key facts
- **Amount:** $6.43 billion (Elliptic) or about $6.3 billion (Binance), across 11 chains.
- **Frozen or seized:** about **$2.85 billion**, roughly 44%, mostly stablecoins.
- **Attribution:** the FBI named North Korea's **TraderTraitor** group on October 31.
- **Withdrawals:** paused on October 29, reopening from November 1, starting with Bitcoin.
- Figures as of November 7, 2026. Investigations are ongoing.
:::

## What happened on October 29?

The first outflows began at about **20:05 UTC**. A second wave hit Avalanche and Polygon shortly after 23:00 UTC. Hot wallets on 11 networks were drained in about three hours, according to [Elliptic](https://www.elliptic.co/insights/binance-largest-hack-in-history/).

The largest share came from Ethereum: $3.80 billion across 186 tokens, including 1.9 billion USDT and 823 million USDC. The attackers also took 18,270 BTC, worth about $1.48 billion, and 612.7 million USDT on Tron.

Binance paused withdrawals, which stopped further outflows. Bitcoin fell below $79,000 and about $628 million of leveraged positions were liquidated within an hour. On October 31, the FBI attributed the theft to TraderTraitor, a North Korean hacking group.

![The Binance hack timeline: outflows start at 20:05 UTC on October 29, withdrawals pause, the FBI attributes the theft on October 31 and withdrawals reopen on November 1.](/blog/img/binance-hack-explained-1.webp "Times from Elliptic's analysis.")

## How did the attackers get the funds out?

According to Elliptic, the attackers did not steal private keys. They got Binance's own systems to sign transactions for them. Binance first linked the breach to a compromised laptop belonging to a DevOps engineer, then reported further entry points.

The key technique used **EIP-7702**, an Ethereum feature that lets a normal wallet delegate its behavior to a smart contract. The hot-wallet key signed 50 such authorizations. That let a **sweeper contract**, a contract that moves out any funds that arrive, empty one hot wallet, including 1.6 billion USDT. Because the delegation stayed in place, the wallet kept being swept.

The lesson is that a valid signature can do far more than the signer expected. That applies to individual wallets too.

## Where did the stolen funds go?

As of Elliptic's update:

- **$2.85 billion** has been frozen or seized, about 44% of the total. Most of it is stablecoins frozen by Tether, Circle and other issuers.
- Before the freezes, the attackers swapped about **$786 million** of stablecoins into ETH and TRX, accepting a 12–26% discount to move quickly.
- About **$3.25 billion** remains in assets that cannot be frozen, spread across more than 800 addresses.

Stablecoins can be frozen because their issuers control the token contracts. Native coins such as ETH and BTC cannot be frozen this way.

![The Binance hack in numbers: $6.43 billion stolen, $2.85 billion frozen or seized, $3.25 billion not freezable and 11 chains hit.](/blog/img/binance-hack-explained-2.webp "Elliptic figures, November 2026.")

## What did Binance do?

- **Paused withdrawals** on October 29, which stopped further losses.
- **Said it will cover all losses** from its SAFU emergency fund and company money, and set aside more than $6.34 billion, according to Elliptic.
- **Reopened withdrawals** from November 1, starting with the Bitcoin network.

BNB, the exchange's own token, fell about 8% on October 29 and hit a low near $682 the next day. It was back above $710 by November 2, according to [Bitrue](https://www.bitrue.com/blog/bnb-price-after-binance-hack). Bitrue, citing Reuters, reported customer outflows of about $3.64 billion, about 2.1% of assets.

![The Binance hack in 20 seconds: hot wallets drained, an EIP-7702 sweeper, stablecoins frozen and the lessons for your wallet.](/blog/img/binance-hack-explained-demo.mp4)

## What should you check in your own wallet?

You cannot control an exchange's security, but the same techniques work against individuals.

1. **Read every signature request.** Do not sign a message, approval or wallet delegation you do not understand. A delegation can hand control of the wallet to a contract.
2. **Keep long-term funds in your own wallet.** Binance withdrawals were paused for several days. Self-custody funds were not.
3. **Use separate wallets.** One for creating tokens and trying new sites, another for holding.
4. **Remove old token approvals.** Unlimited approvals let a contract move your tokens later. Use the [token approval checker](/tools/token-approval-checker/) to find and revoke them, and read [ERC-20 approvals explained](/blog/erc20-token-approvals-explained/).

Our guide to [wallet security for token creators](/blog/wallet-security-for-token-creators/) goes into more detail.

## What are the risks that remain?

- **Funds not yet recovered.** About $3.25 billion is still in assets that cannot be frozen.
- **Phishing.** Large hacks are often followed by fake "refund" or "claim" sites. Binance's official channels are the only place to check.
- **Exchange pauses.** A pause can happen again at any exchange during an incident.

## FAQ

### Was Binance hacked?

Yes. On October 29, 2026, attackers drained Binance hot wallets on 11 blockchains. Elliptic counts $6.43 billion stolen.

### Who hacked Binance?

The FBI attributed the theft to TraderTraitor, a North Korean hacking group, on October 31, 2026.

### Has Binance been hacked before?

In October 2022, a bridge on BNB Chain, the blockchain Binance backs, was exploited for about $570 million worth of BNB, as reported by [CNBC](https://www.cnbc.com/2022/10/07/more-than-100-million-worth-of-binances-bnb-token-stolen-in-another-major-crypto-hack.html). The 2026 theft is roughly ten times larger.

### Can my Binance account be hacked?

Individual accounts are usually taken over through phishing or reused passwords, not exchange-wide hacks. Use a unique password, an authenticator app or passkey, and withdrawal address whitelisting.

## Sources

- [Elliptic: The Binance hack, the largest in history](https://www.elliptic.co/insights/binance-largest-hack-in-history/)
- [Bitrue: BNB price after the Binance hack](https://www.bitrue.com/blog/bnb-price-after-binance-hack)
- [CryptoTicker: Why is crypto down today, November 3, 2026](https://cryptoticker.io/en/why-is-crypto-down-today-november-3-2026/)
- [EIP-7702: Set code for EOAs](https://eips.ethereum.org/EIPS/eip-7702)
- [CNBC: BNB Chain bridge exploit, October 2022](https://www.cnbc.com/2022/10/07/more-than-100-million-worth-of-binances-bnb-token-stolen-in-another-major-crypto-hack.html)

DegenKit is non-custodial: every transaction is signed in your own wallet, and you can review your existing approvals with the [token approval checker](/tools/token-approval-checker/).
