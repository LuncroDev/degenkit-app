---
slug: update-metadata
section: solana
order: 4
emoji: "✎"
title: Update Metadata
desc: Edit a token's name, symbol or image, only possible if its metadata wasn't locked.
---

**Update Metadata** edits a token's on-chain name, symbol and image.

## 🔓 When it works

Only when the token's metadata is **mutable**. Tokens created with DegenKit have locked metadata by default, so this tool will tell you the metadata is immutable. It's mainly for tokens created elsewhere with editable metadata.

## 📝 Steps

1. Open **Update Metadata**.
2. Select the token. You must hold its update authority.
3. Change the name, symbol or image. Leave the image empty to keep the current one.
4. Confirm in your wallet.

## 💸 Fee

**0.05 SOL** plus the network fee.

:::note
Wallets and explorers cache token info, so it can take a little while for the new name or image to show everywhere.
:::
