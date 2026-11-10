---
title: 'What Is Elysium? Kinetiq''s Hyperliquid Layer 2 Explained'
slug: what-is-elysium-kinetiq-hyperliquid-l2
date: '2026-11-10'
excerpt: Elysium is Kinetiq's EVM Layer 2 for the Hyperliquid ecosystem, live since November 9, 2026. What it is, its chain ID, how gas works and what to check first.
cover_alt: Elysium Layer 2 explainer
tags:
- Explainer
- News
---

Elysium is an EVM-compatible Layer 2 network built by Kinetiq for the Hyperliquid ecosystem. It settles to HyperEVM instead of Ethereum, pays gas in HYPE, and its mainnet launched on November 9, 2026, according to the sources below.

:::note Key facts
- **Built by:** Kinetiq, the team behind the kHYPE liquid staking protocol.
- **Type:** Arbitrum Orbit Layer 2, settling to HyperEVM, operated with Conduit.
- **Mainnet chain ID:** **99901**. Testnet: 99801. Gas token: **HYPE**.
- **Launch:** mainnet on **November 9, 2026**; extra HyperCore features are planned about four weeks later.
- **Status at launch:** one sequencer and a permissioned validator set, as reported by the sources below.
:::

## What is Elysium?

Elysium is a general-purpose EVM chain, so Solidity and Vyper contracts run on it unchanged and standard tools such as Foundry, Hardhat, ethers and viem work. Kinetiq describes it as a faster execution layer for the Hyperliquid ecosystem, with block times of about 100 milliseconds reported at launch.

## How is it different from other layer 2 networks?

Most Layer 2 networks settle to Ethereum. Elysium settles to **HyperEVM**, the EVM environment of Hyperliquid. It is built on the Arbitrum Orbit stack, the same technology family behind other Arbitrum-based chains, and uses an AnyTrust data availability committee.

Kinetiq's stated plan is that tokens can start on Elysium and later connect to Hyperliquid's trading infrastructure (HyperCore). Those HyperCore hooks are described as arriving after mainnet, so at launch Elysium is mainly a fast EVM chain.

## What are the network details?

As far as we know, the mainnet details are:

| Item | Value |
|---|---|
| Network name | Elysium |
| Chain ID | 99901 |
| Currency symbol | HYPE |
| Parent chain | HyperEVM (chain ID 999) |

Always copy the RPC URL and bridge link from Elysium's official channels, not from a social media post. Fake sites and phishing RPCs appear around every new chain launch, and at least one community bridge was reported as flagged for phishing before launch. A different, older network also called "Elysium" (chain IDs 1338 and 1339) is unrelated.

## How do you add Elysium to a wallet?

In MetaMask, open Settings, then Networks, then Add network, and enter the network name, the chain ID **99901**, the currency symbol **HYPE** and the RPC URL from Elysium's official documentation. Save it, switch to the network, and check that the wallet shows HYPE as the balance currency. If the chain ID shown is anything other than 99901 for mainnet, stop and re-check the source of your details before sending any funds.

## Do you need HYPE to use it?

Yes. Gas on Elysium is paid in HYPE, which is bridged 1:1 from HyperEVM. You need a small amount of HYPE on Elysium before you can send any transaction.

## What are the risks of a brand-new chain?

- **Centralization at launch:** a single sequencer and a whitelisted validator set mean you rely on the operators until the planned decentralization.
- **Bridge risk:** only use bridges linked from Elysium's official channels.
- **New tokens:** a new chain fills with new tokens fast. Check a token before buying. Our guide to [checking a token for rug risk](/blog/check-pons-launchpad-token-rug-risk/) shows the checklist.
- **Not financial advice:** nothing here predicts prices or recommends buying anything.

## FAQ

**What is Elysium in crypto?** An EVM Layer 2 by Kinetiq for the Hyperliquid ecosystem, settling to HyperEVM with HYPE as gas.

**Is Elysium live?** Sources report the mainnet launched on November 9, 2026.

**Can I create a token on Elysium with DegenKit?** Yes. The [Elysium launcher](/launch/elysium/) creates fixed-supply and tax tokens, signed from your own wallet. For how the flow works, see our [token generator guide](/blog/token-generator-robinhood-chain/), or the [launch hub](/launch/) for all networks.

**Is DegenKit affiliated with Elysium or Kinetiq?** No. DegenKit is independent and not affiliated with Kinetiq or Hyperliquid.

:::note Not affiliated
DegenKit is an independent product and is not affiliated with Kinetiq, Elysium or Hyperliquid. Figures come from the public sources below and can change.
:::

## Sources

- [What Is Elysium? Hyperliquid's L2 Explained, Zerion](https://zerion.io/blog/what-is-elysium/)
- [Elysium Mainnet Guide, Bitget Wallet Academy](https://web3.bitget.com/en/academy/how-to-access-elysium-mainnet-bitget-wallet)
- [Elysium RPC and chain details, Quicknode](https://www.quicknode.com/chains/elysium)
- [Elysium, Chainstack](https://chainstack.com/protocols/elysium/)
