export type TelegramCommand = "start" | "help" | "unknown";

export const parseTelegramCommand = (text?: string): TelegramCommand => {
  const normalized = text?.trim().split(/\s+/)[0] ?? "";

  if (normalized === "/start") {
    return "start";
  }

  if (normalized === "/help") {
    return "help";
  }

  return "unknown";
};

export const buildTelegramReplyText = (
  command: TelegramCommand,
  siteUrl: string
): string => {
  switch (command) {
    case "start":
      return `Raid SL Clan is online.\nSite: ${siteUrl}`;
    case "help":
      return `Commands:\n/start - show welcome message\n/help - show this help\nSite: ${siteUrl}`;
    default:
      return `Raid SL Clan bot is intentionally simple.\nSite: ${siteUrl}`;
  }
};
