import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@market/contracts", "@market/data", "@market/api-client"],
  turbopack: {
    root: appDir,
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
      "@market/contracts": "./packages/contracts/src/index.ts",
      "@market/data": "./packages/data/src/index.ts",
      "@market/api-client": "./packages/api-client/src/index.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias["next-intl/config"] = path.resolve("./src/i18n/request.ts");
    return config;
  },
};

export default nextConfig;
