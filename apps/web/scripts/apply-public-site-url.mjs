import { syncPublicSiteUrl } from "./public-site-url.js";

syncPublicSiteUrl({
  configPath: new URL("../wrangler.jsonc", import.meta.url),
  publicSiteUrl: process.env.PUBLIC_SITE_URL
});
