# MTN Mobile Money payment readiness

The application remains in `PAYMENT_PROVIDER=INTERNAL` until every item below is complete. Internal payments are simulations and must never be treated as bank or MTN transfers.

## Required before enabling MTN

1. Use MTN sandbox credentials first; never production credentials in development.
2. Set the server-only credentials listed in `.env.example`. Do not expose them to the client or commit `.env`.
3. Register a public HTTPS callback URL and validate its signature/authentication according to the final MTN API contract.
4. Implement the MTN provider adapter only after receiving the current official API specification and test credentials.
5. Validate receiver names and phones, test pending, failed, timeout, duplicate-callback, and insufficient-balance cases.
6. Reconcile every provider transaction reference against the immutable payment ledger before production release.
7. Obtain written owner approval for a small controlled pilot before enabling production payments.

## Existing safeguards

- Owner approval is required before payroll, advance, food, and shopkeeper payments.
- Payment actions are manager-scoped where applicable.
- Payment actions are rate-limited and use generated references.
- The owner can call `GET /api/payments/readiness` to see non-secret configuration status.

## Important limitation

Do not set `PAYMENT_PROVIDER=MTN` yet: there is intentionally no live MTN adapter or callback handler in this codebase. This prevents accidental real-money transfers until the official integration details are supplied.
