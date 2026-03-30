/**
 * Flow schema export - strips non-serializable fields (action functions)
 * and produces JSON-safe flow descriptors for AI agent consumption.
 *
 * Used at runtime to power the /schemas/ endpoint.
 */

import type { FlowSpec, StepSpec } from "./types.js";
import { getAllFlows } from "./registry.js";

interface StepSchema {
  id: string;
  label: string;
  description: string;
  role: StepSpec["role"];
  variant?: StepSpec["variant"];
  optional?: boolean;
  rfc2119?: StepSpec["rfc2119"];
  inputFields?: StepSpec["inputFields"];
  sdkMethod?: string;
  branches?: { id: string; label: string; style: string }[];
  branchSteps?: Record<string, string[]>;
}

interface FlowSchema {
  id: string;
  label: string;
  description: string;
  states: { id: string; label: string; terminal?: boolean }[];
  steps: StepSchema[];
  sourceUrl?: string;
}

function stripStep(step: StepSpec): StepSchema {
  const s: StepSchema = {
    id: step.id,
    label: step.label,
    description: step.description,
    role: step.role,
  };
  if (step.variant) s.variant = step.variant;
  if (step.optional) s.optional = true;
  if (step.rfc2119) s.rfc2119 = step.rfc2119;
  if (step.inputFields) s.inputFields = step.inputFields;
  if (step.sdkMethod) s.sdkMethod = step.sdkMethod;
  if (step.branches) s.branches = step.branches.map((b) => ({ id: b.id, label: b.label, style: b.style }));
  if (step.branchSteps) s.branchSteps = step.branchSteps;
  return s;
}

function stripFlow(flow: FlowSpec): FlowSchema {
  return {
    id: flow.id,
    label: flow.label,
    description: flow.description,
    states: flow.states.map((st) => {
      const o: FlowSchema["states"][number] = { id: st.id, label: st.label };
      if (st.terminal) o.terminal = true;
      return o;
    }),
    steps: flow.steps.map(stripStep),
    ...(flow.sourceUrl ? { sourceUrl: flow.sourceUrl } : {}),
  };
}

/** Returns all registered flows as JSON-safe schema objects. */
export function exportAllSchemas(): FlowSchema[] {
  return getAllFlows().map(stripFlow);
}

/** Returns the index: { flows: [...ids], version } */
export function exportSchemaIndex(): { version: string; flows: { id: string; label: string; stepCount: number }[] } {
  return {
    version: "2.0",
    flows: getAllFlows().map((f) => ({ id: f.id, label: f.label, stepCount: f.steps.length })),
  };
}
