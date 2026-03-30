/** No-op shim - CliSigner uses existsSync, unused in browser. */
export function existsSync(): false {
  return false;
}
