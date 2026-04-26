import { describe, expect, it } from "vitest";
import { normalizeTelegramUpdate } from "@raid/platform";

describe("normalizeTelegramUpdate", () => {
  it("extracts the chat id and text from a Telegram message update", () => {
    expect(
      normalizeTelegramUpdate({
        update_id: 1,
        message: {
          message_id: 2,
          date: 1_714_000_000,
          chat: {
            id: 42,
            type: "private"
          },
          text: "/start"
        }
      })
    ).toEqual({
      chatId: "42",
      text: "/start"
    });
  });

  it("returns null when the update shape is unsupported", () => {
    expect(
      normalizeTelegramUpdate({
        update_id: 1,
        callback_query: {
          id: "cbq-1"
        }
      })
    ).toBeNull();
  });

  it("returns null for a top-level null payload", () => {
    expect(normalizeTelegramUpdate(null)).toBeNull();
  });

  it("returns null when the chat id is not a string or number", () => {
    expect(
      normalizeTelegramUpdate({
        update_id: 1,
        message: {
          chat: {
            id: {
              nested: "nope"
            }
          }
        }
      })
    ).toBeNull();
  });
});
