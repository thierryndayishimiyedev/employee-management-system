# MTN Mobile Money payment readiness book

## Current state — safe simulation only

The application is intentionally on `PAYMENT_PROVIDER=INTERNAL`. A click on **Pay** currently exercises the approval and ledger workflow, but it does **not** send money from an MTN SIM. The Owner dashboard shows **Not connected** for the SIM balance until a verified MTN Disbursement adapter has been installed. It must never show an estimated or manually invented balance.

Do **not** set `PAYMENT_PROVIDER=MTN` yet. The server rejects unsupported live providers, which prevents accidental real-money transfers.

## What the boss / MTN account owner must provide

Give these to the developer through a secure password manager or secret vault — never in WhatsApp, email, source code, screenshots, Git, or the frontend:

1. A registered **MTN MoMo Business / Disbursement** account for the one company SIM/wallet that sends all payments.
2. Confirmation of the legal company name, MTN wallet number, settlement currency (RWF), and which staff member is the authorised owner of that wallet.
3. Official MTN MoMo developer-portal access and the current **Disbursement API** documentation for Rwanda. Collection credentials alone cannot send payroll money.
4. Sandbox credentials: API user ID, API key/primary key, subscription key, target environment, and sandbox wallet details.
5. Production credentials after sandbox acceptance: production API user/key, subscription key, product subscription, and production base URL.
6. A public, dedicated HTTPS domain for callbacks, for example `https://api.your-company.rw/api/payments/mtn/callback`. It must have a valid TLS certificate and be reachable from MTN.
7. The official callback/webhook authentication or signature-verification requirements supplied by MTN.
8. Written rules for maximum payment per transaction, daily wallet limit, and who can approve a production release.
9. A small set of consented test receiver numbers (MTN only) for sandbox and a controlled production pilot.

Never provide the SIM PIN, OTP, or personal phone login to the application or developer. A business API credential with least privilege is the correct integration method.

## What will be built after those details arrive

1. A server-only MTN **Disbursement** provider adapter, separate from the current internal simulator.
2. Secure access-token handling and credential rotation; secrets remain in server environment variables/vault only.
3. A live provider balance lookup. Only an authenticated Owner can see it on the Owner dashboard; no balance is sent to Manager, Accountant, Supplier, or browser logs.
4. Payment initiation with one unique, idempotent reference per approved item. Re-clicking Pay will not create a second transfer.
5. A signed callback endpoint that checks origin/signature, records the provider result, and makes duplicate/out-of-order callbacks harmless.
6. Reconciliation jobs that compare pending records with MTN transaction status and preserve the provider reference, response time, failure reason, and audit actor.
7. A controlled switch from sandbox to production only after tests and written Owner approval.

## Existing workflow that the MTN adapter must preserve

- Accountant records operational data for the assigned Manager only.
- Manager approves or requests changes.
- Owner gives final approval.
- Only the Owner can send payroll, advances, food supplier, shopkeeper, and approved expense payments.
- Records are scoped by company and manager; payment actions are rate-limited and keep generated transaction references.
- Owner payment proof and the Owner dashboard retain paid, unpaid, failed, and time-stamped activity information.

## Required sandbox tests before production

All tests must pass with real sandbox responses, not mocked successes:

1. Successful disbursement and exact wallet-balance update.
2. Invalid or non-MTN receiver number.
3. Receiver-name verification mismatch, if enabled by MTN.
4. Insufficient SIM/wallet balance.
5. MTN timeout and delayed callback.
6. Declined/failed transfer with the provider reason visible to Owner.
7. Duplicate Pay click and duplicate callback: exactly one transfer and one ledger record.
8. Callback signature failure: rejected and logged without changing payment state.
9. Owner, Manager, Accountant, Food Supplier, and unauthenticated attempts: only Owner may initiate payment or view balance.
10. Reconciliation: every MTN provider reference exactly matches one internal payment record.

## Production safety rules

- Use a separate production environment and secret vault; do not place real keys in `.env.example` or Git.
- Enforce HTTPS, strict CORS, Helmet, strong JWT secret, short session expiry, and production logging with no secrets/phone tokens.
- Keep a daily amount limit, per-payment limit, and Owner confirmation step before a payment batch is sent.
- Alert the Owner for every failed payment, callback mismatch, balance query failure, and unusual payment volume.
- Back up the Supabase database and protect service-role access before production.
- Do not allow deleting paid payment records; use a reversal/dispute workflow instead.

## Environment variables required later

The exact names/values are confirmed against the current MTN documentation, but the server will need values equivalent to:

```env
PAYMENT_PROVIDER=MTN
MTN_ENVIRONMENT=sandbox # production only after approval
MTN_DISBURSEMENT_PRIMARY_KEY=
MTN_DISBURSEMENT_USER_ID=
MTN_DISBURSEMENT_API_KEY=
MTN_DISBURSEMENT_SUBSCRIPTION_KEY=
MTN_DISBURSEMENT_CALLBACK_URL=https://your-public-domain/api/payments/mtn/callback
MTN_WEBHOOK_SECRET_OR_SIGNATURE_KEY=
MTN_VERIFY_RECEIVER_NAME=true
```

These values belong only in server deployment secrets. Send the official MTN documentation and sandbox credentials when the boss is available; then the adapter can be implemented and tested safely.
