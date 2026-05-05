export const getAdminAuthHeaders = (token: string): Record<string, string> => ({
  "x-admin-token": token
});

export const verifyAdminToken = (input: {
  expectedToken: string;
  receivedToken: string | null;
}): boolean => {
  if (!input.expectedToken || !input.receivedToken) {
    return false;
  }

  const expectedToken = input.expectedToken;
  const receivedToken = input.receivedToken;
  const maxLength = Math.max(expectedToken.length, receivedToken.length);
  let mismatch = expectedToken.length ^ receivedToken.length;

  for (let index = 0; index < maxLength; index += 1) {
    const expectedCharCode = index < expectedToken.length ? expectedToken.charCodeAt(index) : 0;
    const receivedCharCode = index < receivedToken.length ? receivedToken.charCodeAt(index) : 0;
    mismatch |= expectedCharCode ^ receivedCharCode;
  }

  return mismatch === 0;
};
