import type { NextConfig } from "next";

/**
 * As imagens das receitas vivem no bucket `recipe-images` do próprio projeto
 * Supabase. O host sai da variável de ambiente para não haver domínio fixo no
 * código — em outro projeto, muda a variável e nada mais.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? URL.parse(process.env.NEXT_PUBLIC_SUPABASE_URL)?.hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
