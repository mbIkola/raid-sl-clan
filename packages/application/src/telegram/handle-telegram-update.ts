import { buildTelegramReplyText, parseTelegramCommand } from "@raid/core";

export type TelegramMessageInput = {
  chatId: string;
  text?: string;
};

export type TelegramWebhookResult =
  | { kind: "ignored" }
  | { kind: "reply"; chatId: string; text: string };

export type HandleTelegramUpdateDeps = {
  siteUrl: string;
};

export const createHandleTelegramUpdate = ({
  siteUrl
}: HandleTelegramUpdateDeps) => {
  return (input: TelegramMessageInput | null): TelegramWebhookResult => {
    if (!input?.chatId) {
      return { kind: "ignored" };
    }

    const command = parseTelegramCommand(input.text);

    return {
      kind: "reply",
      chatId: input.chatId,
      text: buildTelegramReplyText(command, siteUrl)
    };
  };
};
