/**
 * Idempotency keys for transfer submissions.
 * A key is generated once per logical transfer attempt and reused for retries
 * of that same attempt, so a retry can never create a duplicate transfer.
 * Keys are never shown to the user and never logged.
 */

export function createIdempotencyKey(): string {
  const webCrypto = typeof crypto !== "undefined" ? crypto : undefined;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
