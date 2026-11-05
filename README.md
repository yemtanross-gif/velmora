# VELMORA — Hybrid Crypto Wallet Platform

Premium hybrid cryptocurrency wallet supporting both **self-custody (connected / local)** wallets and **custodial wallets** powered by Xellar Custodian API.

> **Rebranded from Claimora to Velmora.** All branding, storage keys, colors, and references have been updated.

## Architecture Overview

```
velmora/
├── client/          # React + Vite + TypeScript frontend (upgraded from original)
├── server/          # Node.js + Express + Prisma backend (new)
└── docs/            # API docs, security checklist, Xellar setup, deployment
```

### Wallet Model (Hybrid)

**A. Connected / Self-custody wallets**
- Local encrypted HD wallet (BIP-39 + ethers.js) — keys never leave the device
- MetaMask / WalletConnect-compatible external wallets
- User signs every transaction in their own wallet
- Never request or store recovery phrases or private keys on the server

**B. Velmora Custodial wallets**
- Integrated with **Xellar Custodian / Embedded Wallets API**
- Backend creates and manages customer wallet accounts
- Internal double-entry ledger for balances, pending, reserved, completed
- Deposits, withdrawals, history controlled by backend
- Xellar credentials and signing keys live **only** on the server

## Security Priorities (Implemented / Scaffolded)

- Password hashing (bcrypt)
- JWT sessions + secure cookies
- Role-based access control (Owner / Support)
- Server-side validation on every financial action
- Environment-variable secrets only
- Withdrawal limits, reservation, dual approval path for Owner
- Idempotent webhooks / duplicate protection
- Audit log for sensitive actions
- Rate limiting
- Emergency suspension flag
- Daily reconciliation hooks (provider vs internal ledger)
- Never expose Xellar secrets or private keys to frontend
- Never allow ordinary admin to move customer funds or edit balances

**One Owner only** — configured via environment variable `OWNER_EMAIL` + initial secure bootstrap. No public registration for Owner/Super Admin.

## Getting Started (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL (recommended for production) or SQLite for local
- Xellar Dashboard account + App ID / Client Secret (for custodial features)

### 1. Client

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

### 2. Server

```bash
cd server
cp .env.example .env
# Edit .env with secrets, OWNER_EMAIL, Xellar keys, DATABASE_URL
npm install
npx prisma generate
npx prisma db push   # or migrate
npm run dev
```

Server runs on http://localhost:4000

### Environment Variables (see server/.env.example)

Critical ones:
- `DATABASE_URL`
- `JWT_SECRET`
- `OWNER_EMAIL` / `OWNER_PASSWORD_HASH` (or bootstrap script)
- `XELLAR_APP_ID` / `XELLAR_CLIENT_SECRET` / `XELLAR_ENV=sandbox`
- `WALLETCONNECT_PROJECT_ID` (for external wallet connection)
- Rate limits, withdrawal daily limits, etc.

## Xellar Integration

See `docs/XELLAR_INTEGRATION.md`.

The service layer is implemented. Without valid credentials the custodial endpoints return clear configuration errors. Never hard-code secrets.

## Admin Dashboard

Accessible at `/admin` (protected).

- Exactly one Owner (full control)
- Support staff role: view customers, investigate complaints, respond to tickets — **cannot** approve withdrawals, edit balances, change fees, or access secrets.

## Financial Ledger

Double-entry style internal accounting:
- Available / Pending / Reserved balances
- Unique transaction references
- Immutable transaction records
- Webhook / confirmation-driven credit only
- Withdrawal reservation before broadcast

## Status & Next Steps

- [x] Rebrand to Velmora (all UI, storage, package)
- [x] Preserve original self-custody create / import / unlock / send / receive / balance
- [x] Professional dark banking UI (Claimora design language retained & improved)
- [ ] Full user auth + registration
- [ ] MetaMask + WalletConnect connection
- [ ] Xellar custodial wallet creation & balance sync
- [ ] Double-entry ledger + withdrawal flow
- [ ] Owner admin dashboard
- [ ] MFA, audit logs, reconciliation jobs
- [ ] Production hardening & regulatory review

**Important**: Do not put real customer funds or production Xellar keys into this codebase until security review, penetration testing, and provider approval are complete.

## License

MIT (original) — production financial use requires additional legal & compliance work.
