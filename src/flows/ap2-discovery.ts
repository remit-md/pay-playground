/**
 * AP2 Agent Discovery flow - V2 declarative spec.
 *
 * Shows how an autonomous agent discovers another agent's payment capabilities
 * by fetching the A2A agent card from /.well-known/agent-card.json.
 * No authentication required - agent cards are public.
 *
 * States: init -> fetching -> parsed -> ready (terminal)
 */

import { registerFlow } from "./registry.js";
import type { FlowSpec, FlowContext, StepResult } from "./types.js";
import { net } from "../network.js";

const SOURCE = "src/flows/ap2-discovery.ts";
const API_BASE = net.apiUrl.replace("/api/v1", "");
const CARD_URL = `${API_BASE}/.well-known/agent-card.json`;

interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    extensions?: Array<{ uri: string; description: string; required: boolean }>;
    stateTransitionHistory?: boolean;
  };
  skills: Array<{ id: string; name: string; description: string }>;
  x402?: {
    settleEndpoint: string;
    fees?: { standardBps: number; preferredBps: number; cliffUsd: number };
  };
}

const ap2DiscoveryFlow: FlowSpec = {
  id: "ap2-discovery",
  label: "AP2 Discovery",
  description: "Discover an agent's payment capabilities via A2A agent card.",
  sourceUrl: SOURCE,

  states: [
    { id: "init", label: "Init" },
    { id: "fetching", label: "Fetching" },
    { id: "parsed", label: "Parsed" },
    { id: "ready", label: "Ready", terminal: true },
  ],

  steps: [
    // 1. Fetch agent card
    {
      id: "fetch-card",
      label: "Fetch agent card",
      description:
        "Fetch the A2A agent card from /.well-known/agent-card.json. " +
        "Agent cards are public - no authentication required. " +
        "The card advertises the agent's capabilities, skills, and payment parameters.",
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

        const card = (await res.json()) as AgentCard;
        return {
          request: { method: "GET", url: CARD_URL },
          response: {
            name: card.name,
            a2aEndpoint: card.url,
            protocolVersion: card.protocolVersion,
            version: card.version,
          },
          timeMs,
        };
      },
    },

    // 2. Parse capabilities
    {
      id: "parse-capabilities",
      label: "Parse AP2 capability extension",
      description:
        "Parse the agent card response to find the AP2 protocol extension. " +
        "The extensions array in capabilities declares which protocol extensions " +
        "this agent supports. An AP2 extension means the agent can accept " +
        "IntentMandate-based payments via A2A message/send.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(CARD_URL, {
          headers: { Accept: "application/json" },
        });
        const card = (await res.json()) as AgentCard;
        const timeMs = performance.now() - t0;

        const ap2Ext = card.capabilities?.extensions?.find(
          (e) => e.uri.includes("ap2-protocol.org"),
        );

        return {
          response: ap2Ext
            ? {
                ap2Extension: ap2Ext.uri,
                description: ap2Ext.description,
                required: ap2Ext.required,
              }
            : { note: "No AP2 extension declared in agent card" },
          timeMs,
        };
      },
    },

    // 3. Enumerate skills
    {
      id: "enumerate-skills",
      label: "Enumerate discovered skills",
      description:
        "List all skills advertised by the agent. Skills describe what the agent " +
        "can do - each has an id, name, and description. An agent might expose " +
        "skills like 'pay', 'escrow', 'stream', etc.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(CARD_URL, {
          headers: { Accept: "application/json" },
        });
        const card = (await res.json()) as AgentCard;
        const timeMs = performance.now() - t0;

        return {
          response: {
            skillCount: card.skills?.length ?? 0,
            skills: (card.skills ?? []).map((s) => ({ id: s.id, name: s.name })),
          },
          timeMs,
        };
      },
    },

    // 4. Read x402 payment parameters
    {
      id: "read-x402",
      label: "Read x402 payment parameters",
      description:
        "Extract x402 payment parameters from the agent card. The x402 section " +
        "declares the settle endpoint and fee schedule (standard/preferred bps, " +
        "volume cliff). If present, the agent supports HTTP 402-based payments.",
      role: "agent",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(CARD_URL, {
          headers: { Accept: "application/json" },
        });
        const card = (await res.json()) as AgentCard;
        const timeMs = performance.now() - t0;

        if (!card.x402) {
          return {
            response: { note: "No x402 payment parameters in agent card" },
            timeMs,
          };
        }

        return {
          response: {
            settleEndpoint: card.x402.settleEndpoint,
            fees: card.x402.fees,
          },
          timeMs,
        };
      },
    },

    // 5. Summary
    {
      id: "summary",
      label: "Discovery complete",
      description:
        "Summary of agent discovery. Reports whether the agent supports AP2, " +
        "x402, how many skills it exposes, and the A2A endpoint for sending messages.",
      role: "system",
      sourceFile: SOURCE,
      action: async (_ctx: FlowContext): Promise<StepResult> => {
        const t0 = performance.now();
        const res = await fetch(CARD_URL, {
          headers: { Accept: "application/json" },
        });
        const card = (await res.json()) as AgentCard;
        const timeMs = performance.now() - t0;

        const ap2Ext = card.capabilities?.extensions?.find(
          (e) => e.uri.includes("ap2-protocol.org"),
        );

        return {
          response: {
            supportsAP2: !!ap2Ext,
            supportsX402: !!card.x402,
            endpoint: card.url,
            skills: (card.skills ?? []).map((s) => s.id),
          },
          timeMs,
        };
      },
    },
  ],
};

registerFlow(ap2DiscoveryFlow);
