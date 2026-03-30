/**
 * Helper for constructing webhook step specs.
 * Reduces boilerplate across all 19 webhook steps in flow definitions.
 */

import type { StepSpec, StepResult, FlowContext } from "./types.js";

interface WebhookStepOptions {
  /** Unique step ID (e.g., "webhook-sent") */
  id: string;
  /** Human-readable label */
  label: string;
  /** Step description */
  description: string;
  /** Who receives the webhook */
  role: "agent" | "provider" | "system";
  /** Source file path */
  sourceFile: string;
  /** SDK method name (optional) */
  sdkMethod?: string;
  /** Function that builds the webhook event payload.
   *  Receives FlowContext so it can reference wallet addresses. */
  payload: (ctx: FlowContext) => unknown;
  /** If true, include a simulated POST request to example webhook URL (default: true) */
  showDelivery?: boolean;
}

/**
 * Build a webhook step spec from options.
 * Eliminates the repetitive webhook step boilerplate across flow files.
 */
export function buildWebhookStep(opts: WebhookStepOptions): StepSpec {
  const showDelivery = opts.showDelivery !== false;
  return {
    id: opts.id,
    label: opts.label,
    description: opts.description,
    role: opts.role,
    variant: "webhook",
    sdkMethod: opts.sdkMethod,
    sourceFile: opts.sourceFile,
    action: async (ctx: FlowContext): Promise<StepResult> => {
      const response = opts.payload(ctx);
      if (showDelivery) {
        return {
          request: {
            method: "POST",
            url: "https://your-webhook.example.com",
            headers: { "Content-Type": "application/json" },
          },
          response,
          timeMs: 0,
        };
      }
      return { response };
    },
  };
}
