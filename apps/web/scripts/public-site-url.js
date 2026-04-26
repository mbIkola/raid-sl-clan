import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_SITE_URL_PATTERN = /("PUBLIC_SITE_URL"\s*:\s*")([^"]+)(")/;

export const assertPublicSiteUrl = (publicSiteUrl) => {
  let parsed;

  try {
    parsed = new URL(publicSiteUrl);
  } catch {
    throw new Error("PUBLIC_SITE_URL must be an absolute http(s) URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("PUBLIC_SITE_URL must be an absolute http(s) URL.");
  }

  return parsed.toString().replace(/\/$/, "");
};

export const replacePublicSiteUrl = (configText, publicSiteUrl) => {
  const normalizedUrl = assertPublicSiteUrl(publicSiteUrl);

  if (!PUBLIC_SITE_URL_PATTERN.test(configText)) {
    throw new Error("PUBLIC_SITE_URL entry not found in wrangler config.");
  }

  return configText.replace(PUBLIC_SITE_URL_PATTERN, `$1${normalizedUrl}$3`);
};

export const syncPublicSiteUrl = ({ configPath, publicSiteUrl, log = console }) => {
  if (!publicSiteUrl) {
    log.log("PUBLIC_SITE_URL is not set; leaving wrangler.jsonc unchanged.");
    return false;
  }

  const currentConfig = fs.readFileSync(configPath, "utf8");
  const updatedConfig = replacePublicSiteUrl(currentConfig, publicSiteUrl);

  if (updatedConfig === currentConfig) {
    log.log(`PUBLIC_SITE_URL already matches ${assertPublicSiteUrl(publicSiteUrl)}.`);
    return false;
  }

  fs.writeFileSync(configPath, updatedConfig);
  log.log(`Updated PUBLIC_SITE_URL in ${configPath}.`);
  return true;
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const configPath = path.resolve(scriptDir, "..", "wrangler.jsonc");
  syncPublicSiteUrl({
    configPath,
    publicSiteUrl: process.env.PUBLIC_SITE_URL
  });
}
