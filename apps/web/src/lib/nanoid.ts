// Simple URL-safe token generator (no dependency)
export function nanoid(size = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}
