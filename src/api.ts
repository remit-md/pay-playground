/**
 * Minimal authenticated fetch helpers.
 * Wraps all requests with timing capture for the network log.
 */

import { signRequest, API_URL } from "./wallet.js";
import type { Wallet } from "@pay-skill/sdk";

export const BASE_URL = API_URL;

export interface NetworkLogEntry {
  method: string;
  path: string;
  status: number;
  timeMs: number;
  size: number;
  timestamp: number;
}

/** Captured request log - newest entries at the end. */
export const networkLog: NetworkLogEntry[] = [];

/** Clear all captured network log entries. */
export function clearNetworkLog(): void {
  networkLog.length = 0;
}

function logRequest(method: string, path: string, status: number, timeMs: number, size: number): void {
  networkLog.push({ method, path, status, timeMs, size, timestamp: Date.now() });
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export async function apiPost<T>(path: string, body: unknown, wallet: Wallet): Promise<T> {
  const authHeaders = await signRequest(wallet, "POST", `/api/v1${path}`);
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(body),
  });
  const timeMs = Math.round(performance.now() - start);
  const data = await res.json().catch(() => null);
  const size = data !== null ? JSON.stringify(data).length : 0;
  logRequest("POST", path, res.status, timeMs, size);
  if (!res.ok) throw new ApiError(res.status, data);
  if (data === null) throw new Error(`Non-JSON response from POST ${path}`);
  return data as T;
}

export async function apiGet<T>(path: string, wallet: Wallet): Promise<T> {
  const pathOnly = path.split("?")[0];
  const authHeaders = await signRequest(wallet, "GET", `/api/v1${pathOnly}`);
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders });
  const timeMs = Math.round(performance.now() - start);
  const data = await res.json().catch(() => null);
  const size = data !== null ? JSON.stringify(data).length : 0;
  logRequest("GET", path, res.status, timeMs, size);
  if (!res.ok) throw new ApiError(res.status, data);
  if (data === null) throw new Error(`Non-JSON response from GET ${path}`);
  return data as T;
}

export async function apiDelete(path: string, wallet: Wallet): Promise<void> {
  const authHeaders = await signRequest(wallet, "DELETE", `/api/v1${path}`);
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const timeMs = Math.round(performance.now() - start);
  logRequest("DELETE", path, res.status, timeMs, 0);
  if (!res.ok && res.status !== 204) throw new ApiError(res.status, null);
}

export async function apiGetPublic<T>(path: string): Promise<T> {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`);
  const timeMs = Math.round(performance.now() - start);
  const data = await res.json().catch(() => null);
  const size = data !== null ? JSON.stringify(data).length : 0;
  logRequest("GET", path, res.status, timeMs, size);
  if (!res.ok) throw new ApiError(res.status, data);
  if (data === null) throw new Error(`Non-JSON response from GET ${path}`);
  return data as T;
}
