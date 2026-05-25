const fs = require("fs");
const { generateKeyPairSync } = require("crypto");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
});

const env = `NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-me
SUPABASE_DB_URL=postgresql://postgres.your-project:password@your-pooler.supabase.com:5432/postgres
SUPABASE_DB_SSL=true
SUPABASE_STORAGE_BUCKET=zimrecruit-media
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-me
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=zimrecruit-media
JWT_PRIVATE_KEY_PEM="${privateKey.replace(/\n/g, "\\n")}"
JWT_PUBLIC_KEY_PEM="${publicKey.replace(/\n/g, "\\n")}"
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
`;

fs.writeFileSync(".env.screenshot", env);
console.log("wrote .env.screenshot");
