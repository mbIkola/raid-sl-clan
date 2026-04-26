export function assertPublicSiteUrl(publicSiteUrl: string): string;

export function replacePublicSiteUrl(configText: string, publicSiteUrl: string): string;

export function syncPublicSiteUrl(input: {
  configPath: string | URL;
  publicSiteUrl?: string;
  log?: Pick<Console, "log">;
}): boolean;
