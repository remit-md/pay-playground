/** No-op shim - CliSigner uses homedir, unused in browser. */
export function homedir(): string {
  return "/";
}
