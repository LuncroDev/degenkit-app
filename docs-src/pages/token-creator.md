---
slug: token-creator
section: solana
order: 1
emoji: "◆"
title: Token Creator (Solana)
desc: Create an SPL token with mint and freeze authority revoked and locked metadata, in one signature.
---

The Token Creator mints a new **SPL token** on Solana and sends the whole supply to your wallet.

## 📝 The form

| Field | What it does |
|---|---|
| **Token name** | The long name, for example "Anka Coin" |
| **Symbol** | The short ticker, for example ANKA |
| **Decimals** | Between 0 and 9. Most tokens use 6 or 9 |
| **Total supply** | How many tokens exist. Fixed after creation |
| **Description** | A short line about the token |
| **Token image** | Optional. Uploaded and linked in the metadata. Leave empty to skip |

### ⚙️ Advanced

- **Manual metadata URI:** If you already host your metadata JSON, paste its link. The image upload is skipped.
- **Custom RPC:** Use your own Solana RPC endpoint instead of the default.

## 🔒 What's locked by default

- **Mint authority revoked:** nobody can create more tokens.
- **Freeze authority revoked:** nobody can freeze holders' accounts.
- **Metadata locked (immutable):** name, symbol and image can't be changed later.

:::note
Buyers look for exactly these three things. Keep the toggles on unless you have a specific reason.
:::

## ⛓️ What happens when you press Mint

One transaction creates the mint account, your token account, the supply and the metadata, then revokes the authorities. See [what you sign](/docs/security/) for details.

## 💸 Fee

**0.28 SOL** plus Solana's network fee and the account rent. Wallets on the free list pay no DegenKit service fee. See [Fees](/docs/fees/).

## 🧾 After minting

You get a **receipt** with the mint address, the transaction signature and a link to the explorer. Save the mint address: it's your token's identity.
