import { describe, expect, it } from "vitest";
import { getAdminAuthHeaders, verifyAdminToken } from "@raid/platform";

describe("admin token auth helpers", () => {
  it('returns x-admin-token header from getAdminAuthHeaders("secret-123")', () => {
    expect(getAdminAuthHeaders("secret-123")).toEqual({
      "x-admin-token": "secret-123"
    });
  });

  it("verifies token equality and rejects mismatch", () => {
    expect(
      verifyAdminToken({
        expectedToken: "secret-123",
        receivedToken: "secret-123"
      })
    ).toBe(true);

    expect(
      verifyAdminToken({
        expectedToken: "secret-123",
        receivedToken: "other-token"
      })
    ).toBe(false);
  });

  it("rejects missing or empty token inputs", () => {
    expect(
      verifyAdminToken({
        expectedToken: "",
        receivedToken: "secret-123"
      })
    ).toBe(false);

    expect(
      verifyAdminToken({
        expectedToken: "secret-123",
        receivedToken: ""
      })
    ).toBe(false);

    expect(
      verifyAdminToken({
        expectedToken: "secret-123",
        receivedToken: null
      })
    ).toBe(false);
  });
});
