/** Lazy shim - CliSigner calls promisify(execFile) at module scope.
 *  We return a function so that call succeeds; it only throws if
 *  someone actually invokes the result at runtime in the browser. */
export function promisify(_fn: unknown): (...args: unknown[]) => never {
  return () => {
    throw new Error("node:util.promisify is not available in browser");
  };
}
