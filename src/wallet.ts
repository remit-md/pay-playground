/**
 * Wallet management for the playground.
 * Creates SDK Wallet instances from localStorage-stored private keys.
 * All payment operations use SDK methods (signPermit, payDirect, etc.).
 */

import { Wallet, PrivateKeySigner } from "@pay-skill/sdk";
import { net } from "./network.js";

export { net };
export const API_URL = net.apiUrl;

// ── Key store (module-private) ──────────────────────────────────────────────
// Maps address (lowercase) → private key.  Populated by loadOrCreateWallet().
const keyStore = new Map<string, string>();

function generateKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Load a wallet from localStorage, or create and persist a new one.
 * Returns an SDK Wallet ready for payment operations.
 */
export function loadOrCreateWallet(storageKey: string): Wallet {
  const stored = localStorage.getItem(storageKey);
  let privateKey: string;

  if (stored) {
    privateKey = (JSON.parse(stored) as { privateKey: string }).privateKey;
  } else {
    privateKey = generateKey();
  }

  const wallet = new Wallet({
    privateKey,
    chain: net.chain,
    apiUrl: net.apiUrl,
    routerAddress: net.routerAddress,
  });

  keyStore.set(wallet.address.toLowerCase(), privateKey);

  if (!stored) {
    localStorage.setItem(storageKey, JSON.stringify({
      address: wallet.address,
      privateKey,
    }));
  }

  return wallet;
}

/** Get a PrivateKeySigner for a wallet (for manual EIP-712 signing). */
export function getSignerForWallet(wallet: Wallet): PrivateKeySigner {
  const key = keyStore.get(wallet.address.toLowerCase());
  if (!key) throw new Error("Key not found for wallet " + wallet.address);
  return new PrivateKeySigner(key);
}

// ── Auth signing for reference page + events-panel edge cases ───────────────
// The SDK doesn't expose generic authenticated HTTP, so we keep a thin helper.

const API_REQUEST_TYPES = {
  APIRequest: [
    { name: "method", type: "string" },
    { name: "path", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

/** Generate a random 0x-prefixed hex string. */
export function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return "0x" + Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sign an API request using EIP-712, returning ready-to-use auth headers. */
export async function signRequest(
  wallet: Wallet,
  method: string,
  path: string,
): Promise<Record<string, string>> {
  const signer = getSignerForWallet(wallet);
  const nonce = randomHex(32);
  const timestamp = Math.floor(Date.now() / 1000);

  // Built lazily so net.routerAddress is populated after initContracts()
  const domain = {
    name: "pay",
    version: "0.1",
    chainId: net.chainId,
    verifyingContract: net.routerAddress,
  };

  const message = { method: method.toUpperCase(), path, timestamp, nonce };
  const signature = await signer.signTypedData(domain, API_REQUEST_TYPES, message);

  return {
    "X-Pay-Agent": wallet.address,
    "X-Pay-Nonce": nonce,
    "X-Pay-Timestamp": String(timestamp),
    "X-Pay-Signature": signature,
  };
}

// ── Fund popup ──────────────────────────────────────────────────────────────

/**
 * Open the dashboard fund page in a popup for the given wallet.
 */
export function openFundPopup(wallet: Wallet, isTestnet: boolean): Promise<void> {
  let fundUrl = wallet.createFundLink();
  if (isTestnet) {
    fundUrl += (fundUrl.includes("?") ? "&" : "?") + "testnet";
  }

  const popup = window.open(fundUrl, "pay-fund", "width=1040,height=700,left=100,top=60");
  return new Promise<void>((resolve) => {
    if (!popup) { resolve(); return; }
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); resolve(); }
    }, 500);
  });
}

// ── Return funds ────────────────────────────────────────────────────────────

/**
 * Return all funds from a wallet to a destination address.
 * Gets the real on-chain balance, signs a permit for the router,
 * and sends the full amount via payDirect.
 */
export async function returnFunds(
  from: Wallet,
  toAddress: string,
): Promise<{ tx_hash: string }> {
  const balance = await from.balance();
  if (balance <= 0) {
    throw new Error("No funds to return (balance is 0)");
  }

  const permit = await from.signPermit("direct", balance);
  const result = await from.payDirect(toAddress, balance, "playground return", { permit });
  return result as unknown as { tx_hash: string };
}
