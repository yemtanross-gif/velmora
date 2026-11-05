# Xellar Custodian Integration — Velmora

## Required Credentials

Obtain from the Xellar Dashboard:

- `XELLAR_APP_ID`
- `XELLAR_CLIENT_SECRET`
- Confirm base URL and environment (`sandbox` / production)

Add them to `server/.env` (never commit).

## Key Flows

1. **Custodial account / wallet creation**  
   Use custody login or `/account/create` with `isCustodian: true` and our internal `subId` (user id).

2. **Portfolio / balances**  
   GET portfolio by walletId. Sync into our `Balance` table. Never trust client-reported balances.

3. **Send / withdraw**  
   - User requests withdrawal → backend validates available balance, limits, risk flags  
   - Create `Transaction` with status `RESERVED` and ledger entries  
   - Call Xellar send-token (server-side only)  
   - On webhook confirmation → mark `COMPLETED` and finalize ledger  
   - On failure → release reservation

4. **Webhooks**  
   - Verify signature  
   - Idempotent handling via `requestId` / `idempotencyKey`  
   - Credit deposits only after confirmed status

## Security Notes

- All Xellar calls happen from the backend.
- Secret0 / recovery material handling must follow Xellar guidance and never be exposed to the browser.
- Daily reconciliation job should compare sum of customer liabilities vs provider balances.

## Current Status

Scaffold is in `server/src/services/xellar.ts`.  
Live HTTP calls + HMAC signature generation must be completed with your real credentials and the latest Xellar docs.
