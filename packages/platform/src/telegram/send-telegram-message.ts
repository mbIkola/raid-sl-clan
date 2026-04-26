export type SendTelegramMessageInput = {
  token: string;
  chatId: string;
  text: string;
  fetchFn?: typeof fetch;
};

export const sendTelegramMessage = async ({
  token,
  chatId,
  text,
  fetchFn = fetch
}: SendTelegramMessageInput) => {
  const response = await fetchFn(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}`);
  }

  return response;
};
