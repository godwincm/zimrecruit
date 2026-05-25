import nextEnv from "@next/env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;
const appDir = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(appDir, "../.."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "zimrecruit-media",
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

  reactStrictMode: true,

  modularizeImports: {
    "lucide-react": { transform: "lucide-react/dist/esm/icons/{{member}}" },
  },
};

export default nextConfig;
