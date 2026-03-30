/** No-op shim - CliSigner/LocalChain use child_process, unused in browser. */
export function spawn(): never {
  throw new Error("child_process.spawn is not available in browser");
}
export function exec(): never {
  throw new Error("child_process.exec is not available in browser");
}
export function execFile(): never {
  throw new Error("child_process.execFile is not available in browser");
}
export function execFileSync(): never {
  throw new Error("child_process.execFileSync is not available in browser");
}
export function execSync(): never {
  throw new Error("child_process.execSync is not available in browser");
}
