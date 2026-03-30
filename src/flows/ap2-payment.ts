/**
 * AP2 Payment via A2A flow - V2 declarative spec.
 *
 * Demonstrates an autonomous agent paying another agent using the
 * Agent-to-Agent (A2A) protocol with an AP2 IntentMandate.
 * The agent discovers the provider's card, builds a mandate, signs a permit,
 * and sends a JSON-RPC message/send request to the A2A endpoint.
 *
 * States: discover -> mandate -> send -> completed (terminal)
 */

import { registerFlow } from "./registry.js";
import type { FlowSpec, FlowContext, StepResult } from "./types.js";
import { buildWebhookStep } from "./webhook-helper.js";
import { isTestnet, net } from "../network.js";
import { signRequest, randomHex } from "../wallet.js";

const SOURCE = "src/flows/ap2-payment.ts";
const API_BASE = net.apiUrl.replace("/api/v1", "");
const A2A_ENDPOINT = API_BASE + "/a2a";
const A2A_PATH = "/a2a";
const CARD_URL = `${API_BASE}/.well-known/agent-card.json`;

const AMT = isTestnet ? 5.0 : 0.1;
const UNITS = AMT * 1_000_000;

// Module-level state shared across steps within a single flow execution
let taskId: string;

const ap2PaymentFlow: FlowSpec = {
  id: "ap2-payment",
  label: "AP2 Payment",
  description: "Pay via A2A message/send with an AP2 IntentMandate.",
  sourceUrl: SOURCE,

  states: [
    { id: "discover", label: "Discover" },
    { id: "mandate", label: "Mandate Built" },
    { id: "send", label: "Message Sent" },
    { id: "completed", label: "Completed", terminal: true },
  ],

  steps: [
    // 1. Discover agent card
    {
      id: "discover",
      label: "Fetch agent card",
      description:
        "Fetch the A2A agent card to discover the provider's A2A endpoint. " +
        "The card is public - no authentication needed. " +
        "This is the same discovery step as the AP2 Discovery flow.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(CARD_URL, {
          headers: { Accept: "application/json" },
        });
        const timeMs = performance.now() - t0;

        if (!res.ok) {
          return {
            request: { method: "GET", url: CARD_URL },
            timeMs,
            error: { message: `Agent card fetch failed: HTTP ${res.status}`, status: res.status },
          };
        }

        const card = (await res.json()) as { url: string; name: string };
        return {
          request: { method: "GET", url: CARD_URL },
          response: { name: card.name, a2aEndpoint: card.url },
          timeMs,
        };
      },
    },

    // 2. Build IntentMandate
    {
      id: "build-mandate",
      label: "Construct AP2 IntentMandate",
      description:
        `Build an AP2 IntentMandate authorizing $${AMT.toFixed(2)} USDC. ` +
        "The mandate includes a unique ID, expiry time, issuer address, " +
        "and allowance. No network call - this is pure local construction.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const mandateId = randomHex(16).slice(2);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        const mandate = {
          mandateId,
          expiresAt,
          issuer: ctx.agent.address,
          allowance: { maxAmount: AMT.toFixed(2), currency: "USDC" },
        };

        return {
          response: {
            mandateId: mandate.mandateId,
            expiresAt: mandate.expiresAt,
            issuer: mandate.issuer,
            allowance: mandate.allowance,
          },
        };
      },
    },

    // 3. Sign EIP-2612 permit
    {
      id: "sign-permit",
      label: "Agent signs EIP-2612 permit for Router",
      description:
        `Sign a gasless EIP-2612 permit authorizing the Router to spend $${AMT.toFixed(2)} USDC. ` +
        "The permit is attached to the A2A message so the server can pull funds " +
        "in a single on-chain transaction. " +
        "Pay handles this automatically if you skip it.",
      role: "agent",
      optional: true,
      rfc2119: "MAY",
      sdkMethod: "signPermit",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const contracts = await ctx.agent.getContracts();
        // Note: permit is signed inside the send-message step to avoid nonce conflicts.
        // This step just shows what the permit parameters would be.
        return {
          request: {
            method: "EIP-2612",
            url: "(off-chain signature — deferred to send step)",
            body: {
              spender: contracts.router,
              value: `${AMT} USDC (${UNITS} units)`,
            },
          },
          response: { note: "Permit will be signed in the send step to avoid nonce conflicts" },
        };
      },
    },

    // 4. Send A2A message/send
    {
      id: "send-message",
      label: "POST /a2a (message/send)",
      description:
        "Send a JSON-RPC message/send request to the A2A endpoint. The message " +
        "body includes the AP2 IntentMandate, EIP-2612 permit, payment data " +
        "(recipient, amount, memo), and a nonce. Auth headers are EIP-712 signed.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        // Rebuild mandate and permit for this step
        const mandateId = randomHex(16).slice(2);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const mandate = {
          mandateId,
          expiresAt,
          issuer: ctx.agent.address,
          allowance: { maxAmount: AMT.toFixed(2), currency: "USDC" },
        };

        await ctx.agent.getContracts(); // ensure contracts loaded
        const permit = await ctx.agent.signPermit("direct", AMT);

        const messageId = randomHex(16).slice(2);
        const nonce = randomHex(16);

        const rpcBody = {
          jsonrpc: "2.0",
          id: `playground-${messageId.slice(0, 8)}`,
          method: "message/send",
          params: {
            message: {
              messageId,
              role: "user",
              parts: [
                {
                  kind: "data",
                  data: {
                    model: "direct",
                    to: ctx.provider.address,
                    amount: AMT.toFixed(2),
                    memo: "AP2 playground demo",
                    nonce,
                    permit,
                  },
                },
              ],
              metadata: { ap2Mandate: mandate },
            },
          },
        };

        const authHeaders = await signRequest(ctx.agent, "POST", A2A_PATH);
        const t0 = performance.now();
        const res = await fetch(A2A_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(rpcBody),
        });
        const timeMs = performance.now() - t0;

        const rpcData = (await res.json().catch(() => ({ status: res.status }))) as {
          result?: {
            task?: {
              id: string;
              status: { state: string; message?: string };
              artifacts?: Array<{ parts: Array<{ data: Record<string, unknown> }> }>;
            };
          };
          error?: { code: number; message: string };
        };

        if (rpcData.error) {
          return {
            request: {
              method: "POST",
              url: A2A_ENDPOINT,
              body: {
                method: "message/send",
                mandateId: mandate.mandateId,
                to: ctx.provider.address,
                amount: AMT,
              },
            },
            timeMs,
            error: { message: rpcData.error.message, status: rpcData.error.code },
          };
        }

        const task = rpcData.result?.task;
        if (!task) {
          return {
            request: { method: "POST", url: A2A_ENDPOINT },
            timeMs,
            error: { message: "Unexpected A2A response: no task in result" },
          };
        }

        // Persist taskId for the verify step
        taskId = task.id;

        const txHash = task.artifacts
          ?.flatMap((a) => a.parts)
          .find((p) => p.data?.txHash)?.data?.txHash as string | undefined;

        return {
          request: {
            method: "POST",
            url: A2A_ENDPOINT,
            body: {
              method: "message/send",
              mandateId: mandate.mandateId,
              to: ctx.provider.address,
              amount: AMT,
            },
          },
          response: {
            taskId: task.id,
            state: task.status.state,
            txHash,
            message: task.status.message,
          },
          timeMs,
        };
      },
    },

    // 5. Verify task persisted
    {
      id: "verify-task",
      label: "Verify task via tasks/get",
      description:
        "Send a JSON-RPC tasks/get request to verify the task was persisted " +
        "in the server's task store. Confirms the payment was recorded and " +
        "can be queried later for status.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const rpcBody = {
          jsonrpc: "2.0",
          id: "get-1",
          method: "tasks/get",
          params: { id: taskId },
        };

        const authHeaders = await signRequest(ctx.agent, "POST", A2A_PATH);
        const t0 = performance.now();
        const res = await fetch(A2A_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(rpcBody),
        });
        const timeMs = performance.now() - t0;

        const getData = (await res.json().catch(() => null)) as {
          result?: { task?: { status: { state: string } } };
          error?: { message: string };
        } | null;

        const retrievedState =
          getData?.result?.task?.status?.state ??
          getData?.error?.message ??
          "unknown";

        return {
          request: {
            method: "POST",
            url: A2A_ENDPOINT,
            body: { method: "tasks/get", taskId },
          },
          response: { taskId, state: retrievedState },
          timeMs,
        };
      },
    },

    // 6. Webhook: payment.sent
    buildWebhookStep({
      id: "webhook-sent",
      label: "Expected: payment.sent webhook",
      description:
        "After the payment confirms on-chain, the server delivers a payment.sent " +
        "webhook to the agent's registered URL. Contains tx_hash, from/to addresses, " +
        "amount, and the A2A protocol tag.",
      role: "agent",
      sourceFile: SOURCE,
      showDelivery: false,
      payload: (ctx) => ({
        id: "evt_" + Math.random().toString(36).slice(2, 10),
        event: "payment.sent",
        occurred_at: new Date().toISOString(),
        resource_type: "payment",
        resource_id: taskId,
        currency: "USDC",
        testnet: isTestnet,
        data: {
          from: ctx.agent.address,
          to: ctx.provider.address,
          amount: AMT,
          amount_units: UNITS,
          protocol: "a2a",
        },
      }),
    }),

    // 7. Webhook: payment.received
    buildWebhookStep({
      id: "webhook-received",
      label: "Expected: payment.received webhook",
      description:
        "The provider's registered webhook URL receives a payment.received event. " +
        "Same payload structure as payment.sent, delivered to the receiving party " +
        "so the provider can acknowledge receipt and fulfill the service.",
      role: "provider",
      sourceFile: SOURCE,
      showDelivery: false,
      payload: (ctx) => ({
        id: "evt_" + Math.random().toString(36).slice(2, 10),
        event: "payment.received",
        occurred_at: new Date().toISOString(),
        resource_type: "payment",
        resource_id: taskId,
        currency: "USDC",
        testnet: isTestnet,
        data: {
          from: ctx.agent.address,
          to: ctx.provider.address,
          amount: AMT,
          amount_units: UNITS,
          protocol: "a2a",
        },
      }),
    }),
  ],
};

registerFlow(ap2PaymentFlow);
