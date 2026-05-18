/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT:
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
      process.env.VITE_APPWRITE_ENDPOINT ??
      process.env.REACT_APP_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID:
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT ??
      process.env.VITE_APPWRITE_PROJECT_ID ??
      process.env.REACT_APP_APPWRITE_PROJECT_ID,
    NEXT_PUBLIC_APPWRITE_BUCKET_ID:
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ??
      process.env.NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA ??
      process.env.VITE_APPWRITE_BUCKET_ID ??
      process.env.REACT_APP_APPWRITE_BUCKET_ID,
  },

  // Forward /api/* to the Express backend during development
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
      { protocol: "https", hostname: "cloud.appwrite.io" },
      { protocol: "https", hostname: "*.appwrite.io" },
    ],
  },

  // Strict mode catches potential issues early
  reactStrictMode: true,

  // Bundle only what's needed from lucide
  modularizeImports: {
    "lucide-react": { transform: "lucide-react/dist/esm/icons/{{member}}" },
  },
};

export default nextConfig;
