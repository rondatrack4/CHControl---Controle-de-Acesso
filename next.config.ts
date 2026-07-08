import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // "standalone" só é usado no build do app desktop (empacotado como sidecar
  // do Tauri) — o deploy web/nuvem continua com o modo padrão (`next start`).
  output: process.env.APP_MODE === "desktop" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
