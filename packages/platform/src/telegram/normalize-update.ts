export type TelegramUpdate = {
  update_id: number;
  callback_query?: {
    id: string;
  };
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    chat?: {
      id: unknown;
      type?: string;
    };
  };
};

export type NormalizedTelegramUpdate = {
  chatId: string;
  text?: string;
};

export const normalizeTelegramUpdate = (
  update: TelegramUpdate
): NormalizedTelegramUpdate | null => {
  const chatId = update.message?.chat?.id;

  if (typeof chatId !== "string" && typeof chatId !== "number") {
    return null;
  }

  return {
    chatId: String(chatId),
    text: update.message?.text
  };
};
