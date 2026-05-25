# ZimRecruit

ZimRecruit is a credential-aware recruitment platform for applicants, employers, verifier institutions, and administrators. Application data, identity, files, messaging, and mockchain credential receipts are backed by Supabase.

## Stack

| Capability | Implementation |
| --- | --- |
| Web app | Next.js 14, React, Tailwind |
| API | Express, TypeScript |
| Database | Supabase Postgres |
| Authentication | Supabase Auth |
| File storage | Private Supabase Storage bucket (`zimrecruit-media`) |
| User communication | Conversation/message tables with Supabase Realtime |
| Credential proof | Supabase mockchain receipt ledger |

## Setup

Requirements: Node.js 20+, npm, and a Supabase project.

1. Install packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set the Supabase project URL, anonymous key, service role key, and Postgres connection string.

3. Apply the Supabase schema from the project SQL editor or with `psql`:

   ```bash
   npm run db:schema
   ```

   The migration at `supabase/migrations/0001_initial.sql` creates application tables, the private media bucket policies, Realtime-enabled `messages` and `notifications`, and the Supabase mockchain receipt function. It also upgrades earlier local-ledger records into the Supabase ledger when present.

4. Optionally create an administrator:

   ```bash
   npm run seed:admin
   ```

   For an existing Supabase Auth account, set `ADMIN_SUPABASE_USER_ID` and `ADMIN_EMAIL`; the seed command verifies that the Auth user's email is confirmed and matches before granting `admin`. `ADMIN_PASSWORD` is only used when creating a new admin account and must satisfy the password policy.

5. Run the application:

   ```bash
   npm run dev
   ```

## Supabase Services

### Auth

The browser registers and signs in through Supabase Auth. The API validates the Supabase access token, maps the Auth UUID to platform roles and profiles, and issues its role-aware API access token.

Configure Supabase Auth to require email confirmation before sign-in. Configure password strength to require at least 12 characters with lowercase and uppercase letters, digits, and symbols; enable leaked-password protection when available for the project. The app applies the same password rule in its registration and sign-in forms and the API rejects unconfirmed email sessions.

### Storage

User uploads are stored in the private `zimrecruit-media` bucket under their Auth UUID. Document bytes are downloaded server-side for SHA-256 hashing before a verification request can be submitted.

### Messaging

Authenticated users can start conversations through `/api/messages`, send private messages, and receive in-app notifications. The `messages` and `notifications` tables are added to Supabase Realtime so clients can subscribe to new activity permitted by row-level policies.

### Mockchain Ledger

The mockchain is implemented in Supabase Postgres. Approval calls `append_mockchain_attestation(...)`, which writes a document receipt to `mockchain_attestations` with its verifier, generated receipt hash, and ordered ledger sequence. Supabase enforces one active receipt per document hash, preserves revoked receipt history, and prevents an attested document from being deleted through cascading records. The verification workflow uses Supabase services only.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm test
npm run db:check
npm run seed:admin
```

## Required Environment Values

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Server-side Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for Auth validation and private Storage reads |
| `SUPABASE_DB_URL` | Postgres connection string from Supabase Connect settings |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser publishable/anonymous key |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name, defaults to `zimrecruit-media` |
Keep `SUPABASE_SERVICE_ROLE_KEY` and database credentials server-only.
