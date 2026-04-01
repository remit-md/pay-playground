/**
 * x402 HTTP Payment flow - pay-per-request with a REAL 402 endpoint.
 *
 * Agent discovers x402 support, hits the demo resource (gets 402),
 * signs EIP-3009 TransferWithAuthorization, provider settles on-chain,
 * then agent re-fetches the resource with the payment proof.
 *
 * States: discover -> negotiate -> sign -> settle -> serve (terminal)
 */

import type { FlowSpec, FlowContext, StepResult } from "./types.js";
import { registerFlow } from "./registry.js";
import { buildWebhookStep } from "./webhook-helper.js";
import { isTestnet, net } from "../network.js";
import { getSignerForWallet, randomHex } from "../wallet.js";

const SOURCE = "src/flows/x402.ts";
const AMT = isTestnet ? 5.0 : 0.1;
const UNITS = AMT * 1_000_000;

/** x402 facilitator base URL (NOT under /api/v1) */
const X402_BASE = net.facilitatorUrl;

function getEIP3009Domain() {
  return {
    name: "USD Coin",
    version: "2",
    chainId: net.chainId,
    verifyingContract: net.usdcAddress,
  };
}

const TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

// Shared state across steps in a single execution
let lastTxHash: string;
let lastSettleBody: unknown;
let lastWeatherData: Record<string, unknown> | null = null;

const x402Flow: FlowSpec = {
  id: "x402",
  label: "x402 HTTP Payment",
  description: "Pay-per-request: 402 → sign EIP-3009 → settle → 200.",
  sourceUrl: "https://github.com/remit-md/remit-playground/blob/main/src/flows/x402.ts",

  states: [
    { id: "discover", label: "Discover" },
    { id: "negotiate", label: "Negotiate" },
    { id: "sign", label: "Sign" },
    { id: "settle", label: "Settle" },
    { id: "serve", label: "Served", terminal: true },
  ],

  steps: [
    // 1. Discover x402 support
    {
      id: "discover",
      label: "Agent discovers x402 support",
      description:
        "Agent fetches the public /x402/supported endpoint to learn which " +
        "payment schemes and assets the server accepts.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(`${X402_BASE}/supported`);
        const timeMs = Math.round(performance.now() - t0);
        const data = await res.json().catch(() => ({ status: res.status }));
        if (!res.ok) {
          return {
            request: { method: "GET", url: "/x402/supported" },
            timeMs,
            error: { message: `HTTP ${res.status}`, status: res.status },
          };
        }
        return {
          request: { method: "GET", url: "/x402/supported" },
          response: data,
          timeMs,
        };
      },
    },

    // 2. Request protected resource - expect 402
    {
      id: "request-resource",
      label: "Agent requests protected resource",
      description:
        "Agent sends GET /x402/demo to the server. The server responds " +
        "with HTTP 402 Payment Required and X-Payment headers describing " +
        "the required payment (scheme, amount, asset, payTo address).",
      role: "agent",
      sourceFile: SOURCE,
      action: async (): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(`${X402_BASE}/demo`);
        const timeMs = Math.round(performance.now() - t0);

        // Parse X-Payment headers from the 402 response
        const paymentHeaders: Record<string, string> = {};
        for (const [key, value] of res.headers.entries()) {
          if (key.toLowerCase().startsWith("x-payment")) {
            paymentHeaders[key] = value;
          }
        }

        const body = await res.json().catch(() => null);

        return {
          request: { method: "GET", url: "/x402/demo" },
          response: {
            status: res.status,
            headers: paymentHeaders,
            body,
          },
          timeMs,
        };
      },
    },

    // 3. Sign EIP-3009 TransferWithAuthorization
    {
      id: "sign-authorization",
      label: "Agent signs EIP-3009 TransferWithAuthorization",
      description:
        `Agent signs an EIP-3009 authorization to transfer $${AMT.toFixed(2)} USDC ` +
        "to the Router. This is an off-chain signature - no gas is consumed. " +
        "The authorization includes a random nonce and a 5-minute expiry window.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const signer = getSignerForWallet(ctx.agent);

        const validAfter = 0;
        const validBefore = Math.floor(Date.now() / 1000) + 300;
        const eip3009Nonce = randomHex(32);
        const amountStr = String(UNITS);

        const authMessage = {
          from: ctx.agent.address,
          to: net.routerAddress,
          value: BigInt(amountStr),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce: eip3009Nonce,
        };

        const signature = await signer.signTypedData(
          getEIP3009Domain(),
          TRANSFER_WITH_AUTH_TYPES,
          authMessage,
        );

        const fee = +(AMT * 0.01).toFixed(2);
        const netAmt = +(AMT - fee).toFixed(2);

        // Parse signature into v, r, s components
        const sigClean = signature.startsWith("0x") ? signature.slice(2) : signature;
        const sigR = "0x" + sigClean.slice(0, 64);
        const sigS = "0x" + sigClean.slice(64, 128);
        const sigV = parseInt(sigClean.slice(128, 130), 16);

        // Build the settle body matching server's SettleRequest format
        lastSettleBody = {
          payment: {
            from: ctx.agent.address,
            to: net.routerAddress,
            amount: UNITS,
            settlement: "direct",
            valid_after: String(validAfter),
            valid_before: String(validBefore),
            nonce: eip3009Nonce,
            v: sigV,
            r: sigR,
            s: sigS,
          },
          requirements: {
            scheme: "exact",
            amount: UNITS,
            to: net.routerAddress,
            settlement: "direct",
          },
        };

        const timeMs = Math.round(performance.now() - t0);
        return {
          request: {
            method: "EIP-3009",
            url: "(off-chain signature)",
            body: {
              from: ctx.agent.address,
              to: net.routerAddress,
              value: `${AMT} USDC (${UNITS} units)`,
              validBefore: new Date(validBefore * 1000).toISOString(),
              nonce: eip3009Nonce,
            },
          },
          response: {
            signature: signature.slice(0, 20) + "...",
            nonce: eip3009Nonce,
            validBefore,
            fee: `$${fee.toFixed(2)} (1%)`,
            netToProvider: `$${netAmt.toFixed(2)}`,
          },
          timeMs,
        };
      },
    },

    // 4. Provider settles on-chain
    {
      id: "settle",
      label: "Provider settles payment on-chain",
      description:
        "The resource server (provider) submits the signed EIP-3009 authorization " +
        "to POST /x402/settle. The server verifies the signature, executes the " +
        "USDC transfer on-chain, and returns the transaction hash.",
      role: "provider",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        // x402 facilitator endpoints are public — no auth headers needed
        const res = await fetch(`${X402_BASE}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lastSettleBody),
        });

        const timeMs = Math.round(performance.now() - t0);
        const data = await res.json().catch(() => ({ status: res.status }));

        if (!res.ok) {
          return {
            request: {
              method: "POST",
              url: "/x402/settle",
              body: { paymentPayload: "(EIP-3009 signed authorization)", paymentRequired: "(payment terms)" },
            },
            timeMs,
            error: {
              message: typeof data === "object" && data !== null && "error" in data
                ? String((data as Record<string, unknown>).error)
                : `HTTP ${res.status}`,
              status: res.status,
            },
          };
        }

        lastTxHash = typeof data === "object" && data !== null
          ? String((data as Record<string, unknown>).tx_hash ?? (data as Record<string, unknown>).transactionHash ?? "")
          : "";

        return {
          request: {
            method: "POST",
            url: "/x402/settle",
            body: { paymentPayload: "(EIP-3009 signed authorization)", paymentRequired: "(payment terms)" },
          },
          response: data,
          timeMs,
        };
      },
    },

    // 5. Agent re-fetches resource with payment proof
    {
      id: "receive-resource",
      label: "Agent receives protected resource",
      description:
        "After settlement, the agent retries GET /x402/demo with the " +
        "X-Payment-Response header containing the on-chain tx hash. " +
        "The server verifies the payment and returns the resource (weather data).",
      role: "agent",
      sourceFile: SOURCE,
      action: async (): Promise<StepResult> => {
        const t0 = performance.now();

        const headers: Record<string, string> = {};
        if (lastTxHash) {
          headers["X-Payment-Response"] = lastTxHash;
        }

        const res = await fetch(`${X402_BASE}/demo`, { headers });
        const timeMs = Math.round(performance.now() - t0);
        const data = await res.json().catch(() => null) as Record<string, unknown> | null;
        lastWeatherData = res.ok ? data : null;

        if (!res.ok) {
          return {
            request: {
              method: "GET",
              url: "/x402/demo",
              headers: lastTxHash ? { "X-Payment-Response": lastTxHash } : undefined,
            },
            timeMs,
            error: { message: `HTTP ${res.status}`, status: res.status },
          };
        }

        return {
          request: {
            method: "GET",
            url: "/x402/demo",
            headers: lastTxHash ? { "X-Payment-Response": lastTxHash } : undefined,
          },
          response: data,
          timeMs,
        };
      },
    },

    // 6. Display the protected resource (weather data)
    {
      id: "protected-resource",
      label: "Protected Resource: Current Weather",
      description:
        "This is what the agent paid for - real-time weather data for the " +
        "caller's location, served after on-chain USDC payment via x402.",
      role: "system",
      sourceFile: SOURCE,
      action: async (): Promise<StepResult> => {
        // If step 5 didn't get weather data (settle failed / no funds),
        // try fetching directly to show the demo works even without payment
        let weather = lastWeatherData;

        if (!weather && lastTxHash) {
          // Retry with tx hash
          const res = await fetch(`${X402_BASE}/demo`, {
            headers: { "X-Payment-Response": lastTxHash },
          });
          if (res.ok) {
            weather = await res.json().catch(() => null) as Record<string, unknown> | null;
          }
        }

        if (!weather) {
          // No payment succeeded - show what the 402 paywall looks like
          return {
            request: { method: "RESOURCE", url: "/x402/demo" },
            response: {
              status: "Payment required - fund the agent wallet and re-run the flow",
              resource: "/x402/demo",
              cost: `${AMT.toFixed(2)} USDC`,
              hint: "Click 'Manage Wallet' on the agent to add testnet USDC, then run the x402 flow again.",
            },
            timeMs: 0,
            error: { message: "Settlement did not complete - agent wallet needs USDC to pay the x402 paywall" },
          };
        }

        // Extract human-readable fields from WeatherAPI response
        const loc = weather.location as Record<string, unknown> | undefined;
        const cur = weather.current as Record<string, unknown> | undefined;
        const cond = cur?.condition as Record<string, unknown> | undefined;

        const summary: Record<string, unknown> = {
          resource: "/x402/demo",
          paid: `${AMT.toFixed(2)} USDC`,
          tx_hash: lastTxHash || "0x...",
        };

        if (loc) {
          summary.location = `${loc.name}, ${loc.region}, ${loc.country}`;
        }
        if (cur) {
          summary.temperature = `${cur.temp_f}°F / ${cur.temp_c}°C`;
          summary.feels_like = `${cur.feelslike_f}°F / ${cur.feelslike_c}°C`;
          summary.humidity = `${cur.humidity}%`;
          summary.wind = `${cur.wind_mph} mph ${cur.wind_dir}`;
        }
        if (cond) {
          summary.condition = cond.text;
        }

        return {
          request: { method: "RESOURCE", url: "/x402/demo (paid)" },
          response: summary,
          timeMs: 0,
        };
      },
    },

    // 7. Webhook: x402.settled / payment.received
    buildWebhookStep({
      id: "webhook-settled",
      label: "Expected: x402.settled webhook",
      description:
        "After on-chain settlement, the server delivers an x402.settled or " +
        "payment.received webhook to the provider's registered URL. " +
        "Contains the tx_hash, payment amount, and payer address.",
      role: "provider",
      sourceFile: SOURCE,
      payload: (ctx) => ({
        id: "evt_" + Math.random().toString(36).slice(2, 10),
        event: "x402.settled",
        occurred_at: new Date().toISOString(),
        resource_type: "payment",
        currency: "USDC",
        testnet: isTestnet,
        data: {
          protocol: "x402",
          from: ctx.agent.address,
          to: ctx.provider.address,
          amount: AMT,
          amount_units: UNITS,
          tx_hash: lastTxHash || "0x...",
        },
      }),
    }),
  ],
};

registerFlow(x402Flow);
