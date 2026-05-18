# ZimRecruit Deployment Guide

This project uses Appwrite for identity plus one storage bucket, MySQL for platform data, and a local Hardhat chain for credential attestations.

## 1. Deployment Model

Production services:

- `web`: Next.js frontend.
- `api`: Express API.
- `mysql`: source of truth for users, roles, jobs, applications, document records, hashes, audit logs, and on-chain attestation metadata.
- `redis`: rate limiting, queues, and future token deny-list support.
- `appwrite`: authentication and one Storage bucket only.
- `local-chain`: deployed `ZimRecruitRegistry` contract.
- `nginx`: HTTPS reverse proxy.

Appwrite is intentionally not used as the application database. Appwrite Storage stores files only; Appwrite's own docs describe Storage as file storage and direct data records to Databases instead: https://appwrite.io/docs/products/storage

## 2. Environment

Copy `.env.example` to `.env` and fill these groups:

- App URLs: `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`.
- MySQL: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SSL`.
- Appwrite: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_MEDIA`, `NEXT_PUBLIC_APPWRITE_*`.
- JWT: `JWT_PRIVATE_KEY_PEM`, `JWT_PUBLIC_KEY_PEM`.
- Blockchain: `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_CHAIN_ID`, `CONTRACT_ADDRESS`, `VERIFIER_PRIVATE_KEY`, `VERIFIER_WALLET_ADDRESS`.
- Admin bootstrap: `ADMIN_APPWRITE_USER_ID`, `ADMIN_EMAIL`, `ADMIN_FULL_NAME`.

Generate JWT keys:

```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out pub.pem
```

Paste them into `.env` with newlines escaped as `\n`.

## 3. Appwrite

Create one Appwrite project and enable Email/Password authentication.

Create exactly one bucket:

- Bucket ID: `zimrecruit-media`
- Env vars: `APPWRITE_BUCKET_MEDIA=zimrecruit-media` and `NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA=zimrecruit-media`
- Purpose: avatars, logos, images, and uploaded credential files.
- Maximum file size: start with 10 MB.
- Allowed extensions: `pdf`, `png`, `jpg`, `jpeg`, `webp`, `svg`.

Permissions:

- Grant `create` to authenticated users at the bucket level.
- Avoid broad bucket-level `read`; files are streamed through the API where role checks happen.
- Use the server API key only on the API service, never in the browser.

Appwrite bucket and permission behavior is documented here:

- Buckets: https://appwrite.io/docs/products/storage/buckets
- Storage permissions: https://appwrite.io/docs/products/storage/permissions

## 4. MySQL

Local:

```bash
cd infra/docker
docker compose up mysql redis -d
docker compose ps
```

Load schema:

```bash
mysql -h 127.0.0.1 -u zimrecruit -p zimrecruit < infra/docker/schema.sql
```

Verify schema:

```bash
npm run db:check
```

Production:

- Use MySQL 8.0+.
- Create a dedicated database user for the API.
- Grant only the privileges needed on the `zimrecruit` database.
- Enable encrypted client connections and set `MYSQL_SSL=true`.
- Restrict network exposure with firewall/security-group rules.
- Keep backups and test restores.

MySQL references:

- Encrypted connections: https://dev.mysql.com/doc/refman/8.0/en/encrypted-connections.html
- `bind_address` and server network settings: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## 5. Admin User

Admin accounts are not created from public registration.

1. Preferred: create the admin account in Appwrite Auth, then copy the Appwrite user ID into `.env` as `ADMIN_APPWRITE_USER_ID`.
2. Alternative first bootstrap: set `ADMIN_PASSWORD` temporarily and the script can create the Appwrite admin user for you.
3. Set `ADMIN_EMAIL` and `ADMIN_FULL_NAME`.
4. Run:

```bash
npm run seed:admin
npm run db:check
```

The script is idempotent: rerunning it updates the MySQL mirror user and ensures the `admin` role exists.

Remove `ADMIN_PASSWORD` from `.env` after the bootstrap succeeds.

## 6. Blockchain

Use the local Hardhat chain for development and presentation testing.

Common IDs:

- Local Hardhat chain: `BLOCKCHAIN_CHAIN_ID=31337`

Start the local RPC with `mockchain/start.sh`.

Deploy:

```bash
cd contracts
npm install
npx hardhat test
cd mockchain
bash ./start.sh
```

Copy the deployed registry address into `CONTRACT_ADDRESS` and `NEXT_PUBLIC_CONTRACT_ADDRESS`.

Operational rules:

- Use a dedicated deployer wallet.
- Use a multisig for `PLATFORM_ADMIN_ADDRESS`.
- Keep `VERIFIER_PRIVATE_KEY` in the API environment only.
- Rotate verifier wallets if staff leave.
- Store only SHA-256 document hashes on-chain, never personal data.

Hardhat describes itself as covering testing, deployment, and verification workflows: https://hardhat.org/

For explorer verification with Hardhat, use the explorer/Hardhat verification flow for the target network: https://docs.etherscan.io/contract-verification/verify-with-hardhat

## 7. Build And Release

Preflight:

```bash
npm run typecheck
npm test
npm run test:contracts
npm run build
```

Docker deployment:

```bash
cd infra/docker
docker compose up -d --build
docker compose ps
```

Smoke checks:

```bash
curl https://your-domain/health
npm run db:check
```

Then test:

- Register/login with Appwrite.
- Seed and login as admin.
- Create an employer and a job.
- Upload a document.
- Request verification.
- Approve verification and confirm the transaction hash is recorded in MySQL.
- Search the public verification page by document hash.

## 8. Backups

Back up:

- MySQL database.
- Appwrite bucket contents.
- Appwrite project/auth configuration.
- Smart contract deployment address and ABI.
- `.env` secrets in a secure vault.

Do not back up private keys into the repo.
