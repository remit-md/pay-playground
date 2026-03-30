/**
 * Minimal browser shim for Node.js Buffer.
 * The SDK uses Buffer.from() for base64 encode/decode in x402.
 */
class BufferShim {
  private data: Uint8Array;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  static from(input: string | Uint8Array | ArrayBuffer, encoding?: string): BufferShim {
    if (typeof input === "string") {
      if (encoding === "base64") {
        const binary = atob(input);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new BufferShim(bytes);
      }
      return new BufferShim(new TextEncoder().encode(input));
    }
    if (input instanceof ArrayBuffer) return new BufferShim(new Uint8Array(input));
    return new BufferShim(input);
  }

  static isBuffer(obj: unknown): boolean {
    return obj instanceof BufferShim;
  }

  toString(encoding?: string): string {
    if (encoding === "base64") {
      let binary = "";
      for (const byte of this.data) binary += String.fromCharCode(byte);
      return btoa(binary);
    }
    if (encoding === "hex") {
      return Array.from(this.data, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    return new TextDecoder().decode(this.data);
  }

  get length(): number {
    return this.data.length;
  }
}

export const Buffer = BufferShim;
