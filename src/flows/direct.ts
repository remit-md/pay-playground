/**
 * Direct Payment flow - V2 declarative spec.
 *
 * Agent signs an EIP-2612 permit and sends USDC directly to provider.
 * No escrow, no intermediary. Fastest possible payment path.
 *
 * States: init -> signed -> sent -> confirmed (terminal)
 */

import { registerFlow } from "./registry.js";
import type { FlowSpec, FlowContext, StepResult } from "./types.js";
import { buildWebhookStep } from "./webhook-helper.js";
import { isTestnet } from "../network.js";

const AMT = isTestnet ? 5.0 : 0.1;
const UNITS = AMT * 1_000_000;

const directFlow: FlowSpec = {
  id: "direct",
  label: "Direct Payment",
  description: "Instant USDC transfer with no escrow.",

  states: [
    { id: "init", label: "Init" },
    { id: "signed", label: "Permit Signed" },
    { id: "sent", label: "Payment Sent" },
    { id: "confirmed", label: "Confirmed", terminal: true },
  ],

  steps: [
    {
      id: "get-contracts",
      label: "Fetch contract addresses",
      description:
        "Retrieve the Router and USDC contract addresses from the API. " +
        "These are needed to construct the permit and route the payment.",
      role: "system",
      rfc2119: "MUST",
      sdkMethod: "getContracts",
      sourceFile: "src/flows/direct.ts",
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const contracts = await ctx.agent.getContracts();
        const timeMs = performance.now() - t0;
        return {
          request: {
            method: "GET",
            url: "/contracts",
          },
          response: contracts,
          timeMs,
        };
      },
    },

    {
      id: "sign-permit",
      label: "Agent signs EIP-2612 permit",
      description:
        `Agent signs a gasless EIP-2612 permit authorizing the Router to spend $${AMT.toFixed(2)} USDC. ` +
        "This is an off-chain signature - no gas is consumed. Pay handles this automatically if you skip it.",
      role: "agent",
      optional: true,
      rfc2119: "MAY",
      sdkMethod: "signPermit",
      sourceFile: "src/flows/direct.ts",
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const contracts = await ctx.agent.getContracts();
        // Note: permit is signed automatically inside payDirect (auto-permit).
        // This step shows what the permit parameters would be.
        return {
          request: {
            method: "EIP-2612",
            url: "(off-chain signature — handled by auto-permit in next step)",
            body: {
              spender: contracts.router,
              value: `${AMT} USDC (${UNITS} units)`,
            },
          },
          response: { note: "Permit will be signed automatically in the payment step" },
        };
      },
    },

    {
      id: "pay-direct",
      label: "Agent sends direct payment",
      description:
        `Agent calls payDirect to transfer $${AMT.toFixed(2)} USDC to the provider. ` +
        "The permit is attached so the Router can pull funds in a single transaction.",
      role: "agent",
      rfc2119: "MUST",
      sdkMethod: "payDirect",
      inputFields: [
        { field: "to", keyword: "REQUIRED", note: "Payee address. MUST be 0x-prefixed, 40 hex chars. MUST NOT equal sender." },
        { field: "amount", keyword: "REQUIRED", note: "USDC amount. MUST be > 0. Up to 6 decimal places." },
        { field: "memo", keyword: "OPTIONAL", note: "Human-readable note. MAY be omitted." },
        { field: "permit", keyword: "OPTIONAL", note: "EIP-2612 permit. MAY be omitted - Remit auto-handles approval." },
      ],
      sourceFile: "src/flows/direct.ts",
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const tx = await ctx.agent.payDirect(
          ctx.provider.address,
          AMT,
          "direct-payment:playground",
        );
        const timeMs = performance.now() - t0;
        return {
          request: {
            method: "POST",
            url: "/payments/direct",
            body: {
              to: ctx.provider.address,
              amount: AMT,
              memo: "direct-payment:playground",
              permit: "(attached)",
            },
          },
          response: tx,
          timeMs,
        };
      },
    },

    buildWebhookStep({
      id: "webhook-agent",
      label: "Expected: payment.completed webhook (agent)",
      description:
        "After the payment confirms on-chain, the server delivers a payment.completed " +
        "webhook to the agent's registered URL. Contains tx_hash, from/to addresses, " +
        "amount, fee, and memo.",
      role: "agent",
      sdkMethod: "payDirect",
      sourceFile: "src/flows/direct.ts",
      showDelivery: false,
      payload: (ctx) => ({
        event: "payment.completed",
        data: {
          from: ctx.agent.address,
          to: ctx.provider.address,
          amount: UNITS,
          fee: Math.floor(UNITS / 100),
          memo: "direct-payment:playground",
        },
      }),
    }),

    buildWebhookStep({
      id: "webhook-provider",
      label: "Expected: payment.completed webhook (provider)",
      description:
        "The provider's registered webhook URL also receives a payment.completed event. " +
        "Same payload — both sides get notified, enabling the provider to acknowledge " +
        "receipt and fulfill the service.",
      role: "provider",
      sdkMethod: "payDirect",
      sourceFile: "src/flows/direct.ts",
      showDelivery: false,
      payload: (ctx) => ({
        event: "payment.completed",
        data: {
          from: ctx.agent.address,
          to: ctx.provider.address,
          amount: UNITS,
          fee: Math.floor(UNITS / 100),
          memo: "direct-payment:playground",
        },
      }),
    }),
  ],

  sourceUrl: "src/flows/direct.ts",
};

registerFlow(directFlow);
