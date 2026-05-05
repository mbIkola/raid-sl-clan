export type TelegramUserWhitelist = {
  isAllowed(telegramUserId: string): boolean;
};

export const createTelegramUserWhitelist = (
  allowedUserIds: string[]
): TelegramUserWhitelist => {
  const allowedSet = new Set(
    allowedUserIds
      .map((userId) => userId.trim())
      .filter((userId) => userId.length > 0)
  );

  return {
    isAllowed(telegramUserId: string) {
      return allowedSet.has(telegramUserId.trim());
    }
  };
};
