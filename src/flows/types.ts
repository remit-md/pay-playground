/**
 * Flow specification types for Playground V2.
 * Flows are declarative - they describe steps, branches, and expected behavior.
 * The view layer executes them and renders results.
 */

import type { Wallet } from "@pay-skill/sdk";

/** Context passed to every step's action function */
export interface FlowContext {
  agent: Wallet;
  provider: Wallet;
}

/** Result of executing a single step */
export interface StepResult {
  /** The raw HTTP request sent (method, url, headers, body) */
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  /** The raw HTTP response received */
  response?: unknown;
  /** Wall-clock time in ms */
  timeMs?: number;
  /** Error if step failed */
  error?: { message: string; status?: number };
}

/** A branch option shown at decision points */
export interface BranchOption {
  id: string;
  label: string;
  /** Icon/emoji for the button */
  icon?: string;
  /** Visual style: "primary" (green/teal) or "destructive" (red) or "muted" (gray) */
  style: "primary" | "destructive" | "muted";
}

/** A single step in a flow */
export interface StepSpec {
  /** Unique ID within the flow (e.g., "sign-permit", "release-escrow") */
  id: string;
  /** Human-readable label (e.g., "Agent signs EIP-2612 permit") */
  label: string;
  /** Longer description/prose for the docs view */
  description: string;
  /** Who performs this step */
  role: "agent" | "provider" | "system";
  /** Visual variant */
  variant?: "webhook" | "decision" | "wait";
  /** The async function that executes this step. Returns the result. */
  action: (ctx: FlowContext) => Promise<StepResult>;
  /** If this is a decision point, the available branches */
  branches?: BranchOption[];
  /** If branching, which subsequent step IDs belong to each branch.
   *  Key = branch option ID, value = array of step IDs that follow */
  branchSteps?: Record<string, string[]>;
  /** The SDK method name (for code sample lookup), e.g., "payDirect" */
  sdkMethod?: string;
  /** GitHub path to the relevant source file (relative to repo root) */
  sourceFile?: string;
  /** If true, this step can be skipped - Pay handles it automatically */
  optional?: boolean;
  /** RFC 2119 keyword for this step (MUST, SHOULD, MAY, etc.) */
  rfc2119?: "MUST" | "MUST NOT" | "SHOULD" | "SHOULD NOT" | "MAY";
  /** Field-level RFC 2119 annotations (from OpenAPI spec) */
  inputFields?: { field: string; keyword: "REQUIRED" | "OPTIONAL" | "MUST" | "MUST NOT" | "SHOULD" | "MAY"; note: string }[];
}

/** State in the flow's state machine diagram */
export interface FlowState {
  id: string;
  label: string;
  /** Is this a terminal state? */
  terminal?: boolean;
}

/** A complete flow specification */
export interface FlowSpec {
  /** Unique flow ID (e.g., "direct", "escrow") */
  id: string;
  /** Display label (e.g., "Direct Payment") */
  label: string;
  /** One-line description */
  description: string;
  /** States for the state machine diagram */
  states: FlowState[];
  /** Ordered steps */
  steps: StepSpec[];
  /** GitHub repo path for "View Source" link */
  sourceUrl?: string;
}
