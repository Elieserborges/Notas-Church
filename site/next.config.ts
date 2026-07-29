import type { NextConfig } from "next";

// Permite carregar imagens do Supabase Storage (banner enviado no painel).
function supabaseHost(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

const host = supabaseHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
