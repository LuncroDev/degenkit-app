---
slug: security
section: ref
order: 2
emoji: "🔒"
title: Security
desc: What DegenKit can and can't do, what you sign, and how to stay safe.
---

DegenKit is **non-custodial**. Every action is a transaction you review and sign in your own wallet.

## ✅ What we can't do

- We never ask for your seed phrase or private key.
- We can't move your tokens or funds. Nothing happens without your signature.
- We can't change your token after creation: Solana authorities are revoked and metadata is locked, and EVM tokens have no mint function.

## ✍️ What you sign on Solana

The Token Creator builds one transaction that creates the mint, your token account, the supply and the metadata, then revokes the authorities. The service fee is a plain SOL transfer to our public fee address:

`A4zUeyAsG1R9JGgqAThryftTZdYDxtEe3fkXhGvkzCPB`

With most wallets the fee is in the same transaction. With some wallets (such as Solflare) it's sent as a separate small transaction after the token is created.

## 🔓 Open source

The code is public: [github.com/yusufkngg/degenkit-app](https://github.com/yusufkngg/degenkit-app). Secrets such as storage credentials and the admin passcode live on the server side, never in the code.

## ⚠️ Honest limits

- **Not audited** by a third-party security firm. Test with a small amount first.
- **New site.** Some wallets may show a warning for new domains. Make sure the address bar says `degenkit.app` exactly.

## 🧑‍💻 Stay safe

- Bookmark `degenkit.app`.
- Check what your wallet shows before approving.
- Never connect your wallet from a link sent by a stranger.

More: [Security & transparency](/security/), [Is DegenKit safe?](/blog/is-degenkit-safe/), [Wallet security for token creators](/blog/wallet-security-for-token-creators/), [Token approvals explained](/blog/erc20-token-approvals-explained/).
