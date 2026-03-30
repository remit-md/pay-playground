/**
 * Browser shim for node:crypto's randomBytes.
 * The SDK uses randomBytes for nonces and idempotency keys.
 */
export function randomBytes(size: number): { toString(encoding: string): string } {
  const buf = crypto.getRandomValues(new Uint8Array(size));
  return {
    toString(encoding: string): string {
      if (encoding === "hex") {
        return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
      }
      return new TextDecoder().decode(buf);
    },
  };
}
