/**
 * SDK sample lookup.
 * Returns code samples for a given flow + step + language.
 * Language-specific files are populated in Wave 4.
 */

import type { SdkSample } from "./types.js";
import { SDK_LANGUAGES } from "./types.js";

// Each language module will register its samples here.
// Key: `${flowId}:${stepId}` → Map<lang, SdkSample>
const sampleStore = new Map<string, Map<string, SdkSample>>();

/** Register a sample for a specific flow step + language. */
export function registerSample(flowId: string, stepId: string, sample: SdkSample): void {
  const key = `${flowId}:${stepId}`;
  let langMap = sampleStore.get(key);
  if (!langMap) {
    langMap = new Map();
    sampleStore.set(key, langMap);
  }
  langMap.set(sample.lang, sample);
}

/** Get all language samples for a flow step. Returns array of SdkSample. */
export function getSamples(flowId: string, stepId: string): SdkSample[] {
  const key = `${flowId}:${stepId}`;
  const langMap = sampleStore.get(key);
  if (!langMap) return [];

  // Return in SDK_LANGUAGES order
  const result: SdkSample[] = [];
  for (const meta of SDK_LANGUAGES) {
    const sample = langMap.get(meta.lang);
    if (sample) result.push(sample);
  }
  return result;
}
