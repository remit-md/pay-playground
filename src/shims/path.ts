/** No-op shim - CliSigner uses path.join, unused in browser. */
export function join(...parts: string[]): string {
  return parts.join("/");
}
