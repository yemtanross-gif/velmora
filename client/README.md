# Velmora Client

React + Vite + TypeScript frontend for the Velmora hybrid crypto wallet.

## Features (current)

- Self-custody wallet create / import / unlock (BIP-39, encrypted with password via ethers.js)
- Real Sepolia balance + send / receive
- Professional dark banking UI (Velmora brand)
- Responsive sidebar + mobile nav

## Hybrid Upgrade Path

This client will connect to the Velmora API (`server/`) for:

- User registration & login
- Custodial wallets (Xellar)
- Connected external wallets (MetaMask / WalletConnect)
- Transaction history from the ledger
- Admin views (Owner / Support)

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:4000` if needed.

## Branding

All former Claimora references have been replaced with **Velmora**.
Color tokens use `velmora-*` in Tailwind.
