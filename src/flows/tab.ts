/**
 * Metered Tab flow -- V2 declarative spec.
 *
 * Open a pre-funded tab, charge per API call with EIP-712 provider
 * signatures, then close to settle on-chain.
 *
 * States: init -> open -> charging -> closed (terminal)
 */

import { registerFlow } from "./registry.js";
import type { FlowSpec, FlowContext, StepResult } from "./types.js";
import { buildWebhookStep } from "./webhook-helper.js";
import { isTestnet } from "../network.js";

const LIMIT = isTestnet ? 10.0 : 1.0;
const PER_UNIT = isTestnet ? 2.5 : 0.25;
const LIMIT_UNITS = LIMIT * 1_000_000;
const SOURCE = "src/flows/tab.ts";

// Shared across steps within a single flow execution
let lastTabId: string;
let lastCloseSig: string;
let cumulative = 0;
let callCount = 0;

function webhookPayload(event: string, extra: Record<string, unknown> = {}): unknown {
  return {
    id: "evt_" + Math.random().toString(36).slice(2, 10),
    event,
    occurred_at: new Date().toISOString(),
    resource_type: "tab",
    resource_id: lastTabId,
    currency: "USDC",
    testnet: isTestnet,
    data: {
      tab_id: lastTabId,
      ...extra,
    },
  };
}

const tabFlow: FlowSpec = {
  id: "tab",
  label: "Metered Tab",
  description: "Open a tab, charge per API call, close to settle.",
  sourceUrl: "src/flows/tab.ts",

  states: [
    { id: "init", label: "Init" },
    { id: "open", label: "Open" },
    { id: "charging", label: "Charging" },
    { id: "closed", label: "Closed", terminal: true },
  ],

  steps: [
    // 1. Get contracts
    {
      id: "get-contracts",
      label: "Fetch contract addresses",
      description:
        "Retrieve the deployed contract addresses from the Remit API. " +
        "The Tab contract address is needed for the permit and EIP-712 charge signatures.",
      role: "system",
      rfc2119: "MUST",
      sdkMethod: "getContracts",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const contracts = await ctx.agent.getContracts();
        const timeMs = Math.round(performance.now() - t0);
        return {
          request: { method: "GET", url: "/contracts" },
          response: contracts,
          timeMs,
        };
      },
    },

    // 2. Sign permit
    {
      id: "sign-permit",
      label: "Agent signs EIP-2612 permit",
      description:
        `Agent signs a gasless EIP-2612 permit authorizing the Tab contract to spend $${LIMIT.toFixed(2)} USDC. ` +
        "This is the tab's spending limit -- the maximum that can be charged before close. " +
        "Pay handles this automatically if you skip it.",
      role: "agent",
      optional: true,
      rfc2119: "MAY",
      sdkMethod: "signPermit",
      sourceFile: SOURCE,
      action: async (): Promise<StepResult> => {
        return {
          request: {
            method: "EIP-2612",
            url: "signPermit(tab, " + LIMIT + ")",
          },
          response: { note: "Permit will be signed automatically in the openTab step" },
        };
      },
    },

    // 3. Open tab
    {
      id: "open-tab",
      label: "Agent opens metered tab",
      description:
        `Agent opens a tab with a $${LIMIT.toFixed(2)} limit and $${PER_UNIT.toFixed(2)} per-unit cost. ` +
        "USDC is locked on-chain; the provider can charge incrementally up to the limit.",
      role: "agent",
      sdkMethod: "openTab",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const result = await ctx.agent.openTab({
          to: ctx.provider.address,
          limit: LIMIT,
          perUnit: PER_UNIT,
        });
        const timeMs = Math.round(performance.now() - t0);
        lastTabId = result.id;
        // Reset cumulative state for this run
        cumulative = 0;
        callCount = 0;
        return {
          request: {
            method: "POST",
            url: "/tabs",
            body: {
              provider: ctx.provider.address,
              limit_amount: LIMIT,
              per_unit: PER_UNIT,
              permit: "(attached)",
            },
          },
          response: result,
          timeMs,
        };
      },
    },

    // 4. Webhook: tab.opened
    buildWebhookStep({
      id: "webhook-opened",
      label: "Webhook: tab.opened",
      description:
        "Server delivers a tab.opened webhook to both parties' registered endpoints. " +
        "Contains the tab ID, limit, and per-unit cost.",
      role: "system",
      sourceFile: SOURCE,
      payload: () => webhookPayload("tab.opened", {
        limit_amount: LIMIT,
        limit_units: LIMIT_UNITS,
        per_unit: PER_UNIT,
      }),
    }),

    // 5. Charge 1
    {
      id: "charge-1",
      label: "Provider charges tab (call 1)",
      description:
        `Provider signs a TabCharge EIP-712 message and charges $${PER_UNIT.toFixed(2)} for the first API call. ` +
        "The signature covers the cumulative total so the on-chain state is always consistent.",
      role: "provider",
      sdkMethod: "chargeTab",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        cumulative = +(PER_UNIT).toFixed(6);
        callCount = 1;
        const cumulativeUnits = BigInt(Math.round(cumulative * 1_000_000));
        const contracts = await ctx.agent.getContracts();
        const t0 = performance.now();
        const providerSig = await ctx.provider.signTabCharge(
          contracts.tab, lastTabId, cumulativeUnits, callCount,
        );
        const chargeRes = await ctx.provider.chargeTab(lastTabId, {
          amount: PER_UNIT,
          cumulative,
          callCount,
          providerSig,
        });
        const timeMs = Math.round(performance.now() - t0);
        return {
          request: {
            method: "POST",
            url: `/tabs/${lastTabId}/charge`,
            body: {
              amount: PER_UNIT,
              cumulative,
              call_count: callCount,
              provider_sig: providerSig.slice(0, 20) + "...",
            },
          },
          response: chargeRes,
          timeMs,
        };
      },
    },

    // 6. Webhook: tab.charged (charge 1)
    buildWebhookStep({
      id: "webhook-charged-1",
      label: "Webhook: tab.charged",
      description:
        "Agent receives a tab.charged webhook after the provider charges the tab. " +
        "Contains the per-call amount and running cumulative total.",
      role: "agent",
      sourceFile: SOURCE,
      payload: () => webhookPayload("tab.charged", {
        amount: PER_UNIT,
        balance_remaining: LIMIT - PER_UNIT,
        charge_count: 1,
      }),
    }),

    // 7. Charge 2
    {
      id: "charge-2",
      label: "Provider charges tab (call 2)",
      description:
        `Provider charges another $${PER_UNIT.toFixed(2)} for the second API call. ` +
        `Cumulative is now $${(PER_UNIT * 2).toFixed(2)}.`,
      role: "provider",
      sdkMethod: "chargeTab",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        cumulative = +(PER_UNIT * 2).toFixed(6);
        callCount = 2;
        const cumulativeUnits = BigInt(Math.round(cumulative * 1_000_000));
        const contracts = await ctx.agent.getContracts();
        const t0 = performance.now();
        const providerSig = await ctx.provider.signTabCharge(
          contracts.tab, lastTabId, cumulativeUnits, callCount,
        );
        const chargeRes = await ctx.provider.chargeTab(lastTabId, {
          amount: PER_UNIT,
          cumulative,
          callCount,
          providerSig,
        });
        const timeMs = Math.round(performance.now() - t0);
        return {
          request: {
            method: "POST",
            url: `/tabs/${lastTabId}/charge`,
            body: {
              amount: PER_UNIT,
              cumulative,
              call_count: callCount,
              provider_sig: providerSig.slice(0, 20) + "...",
            },
          },
          response: chargeRes,
          timeMs,
        };
      },
    },

    // 8. Provider signs close
    {
      id: "sign-close",
      label: "Provider signs final charge for close",
      description:
        "Provider signs the final cumulative state as an EIP-712 TabCharge message. " +
        "This signature authorizes the agent to close the tab and settle on-chain.",
      role: "provider",
      sdkMethod: "signTabCharge",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const finalUnits = BigInt(Math.round(cumulative * 1_000_000));
        const contracts = await ctx.agent.getContracts();
        const t0 = performance.now();
        const closeSig = await ctx.provider.signTabCharge(
          contracts.tab, lastTabId, finalUnits, callCount,
        );
        const timeMs = Math.round(performance.now() - t0);
        // Store closeSig in module scope for the next step
        lastCloseSig = closeSig;
        return {
          request: {
            method: "EIP-712",
            url: `signTabCharge(tab, ${lastTabId.slice(0, 8)}..., ${cumulative}, ${callCount})`,
          },
          response: { signature: closeSig.slice(0, 20) + "..." },
          timeMs,
        };
      },
    },

    // 9. Agent closes tab
    {
      id: "close-tab",
      label: "Agent closes tab",
      description:
        "Agent submits the provider's final signature to close the tab. " +
        "On-chain settlement releases the charged amount to the provider and refunds the remainder.",
      role: "agent",
      sdkMethod: "closeTab",
      sourceFile: SOURCE,
      action: async (ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const result = await ctx.agent.closeTab(lastTabId, {
          finalAmount: cumulative,
          providerSig: lastCloseSig,
        });
        const timeMs = Math.round(performance.now() - t0);
        return {
          request: {
            method: "POST",
            url: `/tabs/${lastTabId}/close`,
            body: {
              final_amount: cumulative,
              provider_sig: lastCloseSig.slice(0, 20) + "...",
            },
          },
          response: result,
          timeMs,
        };
      },
    },

    // 10. Webhook: tab.closed
    buildWebhookStep({
      id: "webhook-closed",
      label: "Webhook: tab.closed",
      description:
        "Server delivers a tab.closed webhook to both parties. " +
        "Contains the final charged total and settlement tx_hash.",
      role: "system",
      sourceFile: SOURCE,
      payload: () => webhookPayload("tab.closed", {
        total_charged: cumulative,
        call_count: callCount,
        refunded: LIMIT - cumulative,
      }),
    }),
  ],
};

registerFlow(tabFlow);
