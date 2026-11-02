# DegenKit

No-code, non-custodial token creator and toolkit for **Solana, Ethereum, BNB Chain (BSC, BNB Smart Chain), Base and Robinhood Chain**. Create, manage, burn, airdrop, and swap tokens — one signature at a time, from your own wallet.

🌐 [degenkit.app](https://degenkit.app)
🐦 [@DegenKitApp](https://x.com/DegenKitApp)
✉️ [support@degenkit.app](mailto:support@degenkit.app)

## What's here

This repo contains the DegenKit website and web app — a static, client-side site plus one small serverless function for image/metadata uploads (see `DEPLOY.md`). Every on-chain action (creating a token, revoking an authority, burning, swapping) is a transaction built in the browser and signed directly by the user's own wallet. DegenKit never holds funds or private keys.

```
/                     Marketing homepage
/launch/              Network selector
/launch/solana/       The Solana token toolkit (Token Creator, My Tokens,
                       Authorities, Update Metadata, Burn, Tax Token,
                       Airdrop, Multisender, Scanner, Vanity Address, Swap)
/launch/ethereum/     Ethereum token creator (ERC-20, tax token)
/launch/bnb/          BNB Chain (BSC / BNB Smart Chain) token creator:
                       BEP-20 token, tax token, My Tokens
/launch/base/         Base token creator (ERC-20, tax token)
/launch/robinhood/    Robinhood Chain token creator
/docs/                Documentation
/security/            Security and transparency page
/blog/                Blog
/terms/, /privacy/    Legal pages
/support/             Support / contact
/assets/              Shared logo, favicon, and stylesheet
```

## BNB Chain support

The BNB Chain launcher (`/launch/bnb/`) works on BNB Smart Chain (BSC, chain ID 56). It creates fixed-supply BEP-20 tokens and tax tokens through two factory contracts, shows the user's own tokens from on-chain records, and links to BscScan. Contracts on BNB Smart Chain:

- Token factory: `0x9dF9EF48C2973B8136fF9d537a8bca58544A1906`
- Tax token factory: `0xF699d7eE1be5353A56463aFB95b262f69520Ca99`

Wallets are discovered with EIP-6963 (MetaMask, Trust, Binance Wallet, OKX, Rabby and others). Nothing is custodial: the user signs every BNB Chain transaction.

## Stack

Plain HTML/CSS/JS — no build step, no framework. On-chain interaction uses:
- [`ethers`](https://docs.ethers.org/v6/) for BNB Chain (BSC), Ethereum, Base and Robinhood Chain (EVM)
- [`@solana/web3.js`](https://github.com/solana-labs/solana-web3.js) and [`@solana/spl-token`](https://github.com/solana-labs/solana-program-library) (loaded from a CDN)
- The [Wallet Standard](https://github.com/wallet-standard/wallet-standard) for multi-wallet support (Phantom, Solflare, Backpack, MetaMask, and others)
- [Jupiter's](https://station.jup.ag/docs/apis/swap-api) aggregator API for the Swap tool
- [Supabase](https://supabase.com) for admin-only usage logs and configurable fees
- [Pinata](https://pinata.cloud) for token image/metadata storage on IPFS

## Running locally

There's no build step — clone the repo and open `index.html`, or serve the folder with any static file server:

```bash
npx serve .
```

## Security

If you find a security issue, please email [support@degenkit.app](mailto:support@degenkit.app) rather than opening a public issue.

## License

See [LICENSE](./LICENSE).
