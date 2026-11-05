# Velmora Security Checklist

- [ ] JWT_SECRET is a long random value
- [ ] OWNER_EMAIL / password set only via secure bootstrap (no public Owner registration)
- [ ] Xellar secrets only in environment / secret manager
- [ ] HTTPS everywhere in production
- [ ] Rate limiting enabled
- [ ] Withdrawal limits + emergency suspend switch
- [ ] All financial mutations server-side + ledger entries
- [ ] Webhook signature verification
- [ ] Idempotency keys on deposits/withdrawals
- [ ] Audit log for admin actions
- [ ] Support role cannot approve withdrawals or edit balances
- [ ] No private keys or recovery phrases stored on server for self-custody wallets
- [ ] Dependency audit + regular updates
- [ ] Penetration test before real funds
- [ ] Legal / regulatory review for your jurisdiction
