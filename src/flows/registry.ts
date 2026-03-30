/**
 * Flow registry - all available flows.
 * Imported by main.ts to populate the flow selector and drive execution.
 */

import type { FlowSpec } from "./types.js";

// Flows will be populated as they're built (Wave 3).
// For now, export an empty array that main.ts can reference.
// Each flow file will register itself via registerFlow().

const flows: FlowSpec[] = [];

export function registerFlow(flow: FlowSpec): void {
  // Avoid duplicates on HMR
  const idx = flows.findIndex((f) => f.id === flow.id);
  if (idx >= 0) flows[idx] = flow;
  else flows.push(flow);
}

export function getAllFlows(): FlowSpec[] {
  return flows;
}

export function getFlow(id: string): FlowSpec | undefined {
  return flows.find((f) => f.id === id);
}
