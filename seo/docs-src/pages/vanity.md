---
slug: vanity
section: solana
order: 9
emoji: "✦"
title: Vanity Address
desc: Generate a Solana address that starts with text you choose, entirely in your browser.
---

A **vanity address** is a Solana keypair whose public address starts with letters you pick.

## 🔐 Privacy

The keypair is generated **locally in your browser** and never sent anywhere. DegenKit cannot recover it.

:::warning Save the private key immediately
If you lose it, it's gone. Copy and store the private key safely as soon as you're happy with the result.
:::

## ⏱️ How long it takes

Only base58 characters are valid (no `0`, `O`, `I` or `l`). Each extra character multiplies the search time by roughly 58. Four or more characters can take a long time on a phone or laptop.
