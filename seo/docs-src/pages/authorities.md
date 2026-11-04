---
slug: authorities
section: solana
order: 3
emoji: "⚷"
title: Authorities
desc: Permanently revoke mint or freeze authority on tokens you control.
---

Authorities are special permissions on a token:

- **Mint authority** can create more tokens.
- **Freeze authority** can freeze a holder's token account.

DegenKit revokes both by default when you create a token. This tool is for tokens where you still hold an authority, for example tokens created elsewhere.

## ⚠️ Permanent

Revoking is **irreversible**. After you revoke mint authority, supply can never grow again. After you revoke freeze authority, accounts can never be frozen.

## 📝 Steps

1. Open **Authorities**.
2. Pick the token from the list.
3. Choose **Revoke mint authority** or **Revoke freeze authority**.
4. Confirm in your wallet.

## 💸 Fee

**0.05 SOL** per revoke action, plus the network fee.

:::warning Check before you revoke
If your project needs to mint more later (for example for vesting), don't revoke mint authority yet. Revoking can't be undone.
:::
