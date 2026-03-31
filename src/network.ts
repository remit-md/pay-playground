/**
 * Network configuration - reads ?network=mainnet from URL.
 * Default: testnet. All network-dependent constants live here.
 */

export type Network = "testnet" | "mainnet";

const params = new URLSearchParams(window.location.search);
export const network: Network =
  params.get("network") === "mainnet" ? "mainnet" : "testnet";
export const isTestnet = network === "testnet";

export interface NetworkConfig {
  apiUrl: string;
  chain: string;
  chainId: number;
  routerAddress: string;
  usdcAddress: string;
  networkUrn: string;
  label: string;
  storagePrefix: string;
}

// Allow overriding API URL via ?api= query param, VITE_API_URL env var, or localStorage.
// Once set via ?api=, persists in localStorage so refreshes/retries keep working.
const apiParam = params.get("api");
if (apiParam) localStorage.setItem("pay-playground-api-override", apiParam);
const apiOverride =
  apiParam ||
  localStorage.getItem("pay-playground-api-override") ||
  import.meta.env.VITE_API_URL ||
  "";

const configs: Record<Network, NetworkConfig> = {
  testnet: {
    apiUrl: apiOverride || "https://testnet.pay-skill.com/api/v1",
    chain: "base-sepolia",
    chainId: 84532,
    routerAddress: "", // Fetched from /contracts on init
    usdcAddress: "",   // Fetched from /contracts on init
    networkUrn: "eip155:84532",
    label: "Base Sepolia",
    storagePrefix: "pay-playground",
  },
  mainnet: {
    apiUrl: "https://pay-skill.com/api/v1",
    chain: "base",
    chainId: 8453,
    routerAddress: "", // Fetched from /contracts on init
    usdcAddress: "",   // Fetched from /contracts on init
    networkUrn: "eip155:8453",
    label: "Base Mainnet",
    storagePrefix: "pay-playground-mainnet",
  },
};

export const net = configs[network];

/** True if mainnet was requested but the server is still on testnet. */
export let mainnetUnavailable = false;

/**
 * Fetch contract addresses from the API and verify chain_id matches.
 * If the server returns a different chain_id than expected (e.g. testnet
 * chain when mainnet was requested), sets mainnetUnavailable = true.
 */
export async function initContracts(): Promise<void> {
  const res = await fetch(`${net.apiUrl}/contracts`);
  if (!res.ok) {
    if (!isTestnet) {
      mainnetUnavailable = true;
      return;
    }
    throw new Error(`Failed to fetch /contracts: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    chain_id: number;
    router: string;
    usdc: string;
  };

  if (data.chain_id !== net.chainId) {
    if (!isTestnet) {
      mainnetUnavailable = true;
      return;
    }
    throw new Error(`Chain mismatch: expected ${net.chainId}, got ${data.chain_id}`);
  }
  if (!data.router || !data.usdc) {
    throw new Error("Invalid /contracts response: missing router or usdc");
  }

  net.routerAddress = data.router;
  net.usdcAddress = data.usdc;
}

/**
 * Switch to a different network by reloading the page with ?network= param.
 * Preserves other query params.
 */
export function switchNetwork(newNetwork: Network): void {
  const url = new URL(window.location.href);
  if (newNetwork === "testnet") {
    url.searchParams.delete("network");
  } else {
    url.searchParams.set("network", newNetwork);
  }
  window.location.href = url.toString();
}
