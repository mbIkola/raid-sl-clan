import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type PublicSiteUrlConfig = {
  vars?: {
    PUBLIC_SITE_URL?: string;
  };
};

const normalizePublicSiteUrl = (value: string) => {
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("PUBLIC_SITE_URL must be an absolute http(s) URL.");
  }

  return parsed.toString().replace(/\/$/, "");
};

export const resolvePublicSiteUrl = () => {
  const envValue = process.env.PUBLIC_SITE_URL;

  if (envValue) {
    return normalizePublicSiteUrl(envValue);
  }

  const configPathCandidates = [
    resolve(process.cwd(), "wrangler.jsonc"),
    resolve(process.cwd(), "apps/web/wrangler.jsonc")
  ];
  const configPath = configPathCandidates.find((candidate) => existsSync(candidate));

  if (!configPath) {
    throw new Error("PUBLIC_SITE_URL config file was not found.");
  }

  const configText = readFileSync(configPath, "utf8");
  const config = JSON.parse(configText) as PublicSiteUrlConfig;
  const configuredValue = config.vars?.PUBLIC_SITE_URL;

  if (!configuredValue) {
    throw new Error("PUBLIC_SITE_URL is not configured.");
  }

  return normalizePublicSiteUrl(configuredValue);
};
