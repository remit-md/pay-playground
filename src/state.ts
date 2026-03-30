/**
 * Reactive state management for Playground V2.
 * Simple pub/sub - no framework needed.
 */

export type ViewMode = "docs" | "timeline";
export type FlowStatus = "idle" | "running" | "paused" | "done" | "error";

export interface PlaygroundState {
  /** Current view mode: Stripe-docs or Timeline-cards */
  viewMode: ViewMode;
  /** ID of the currently selected flow */
  activeFlowId: string;
  /** Index of the current step within the active flow (0-based, -1 = not started) */
  activeStepIndex: number;
  /** Current flow execution status */
  flowStatus: FlowStatus;
  /** Network: "testnet" or "mainnet" */
  network: "testnet" | "mainnet";
  /** Agent wallet balance (real, from on-chain query). null = fetch failed. */
  agentBalance: number | null;
  /** Provider wallet balance (real). null = fetch failed. */
  providerBalance: number | null;
  /** Webhook URL (persisted in localStorage) */
  webhookUrl: string;
  /** Selected webhook event types */
  webhookEvents: string[];
  /** Whether the webhook modal is open */
  webhookModalOpen: boolean;
  /** Error message (if flowStatus === "error") */
  errorMessage: string;
  /** Indices of steps that have completed execution */
  completedSteps: number[];
}

type Listener = (state: PlaygroundState, changedKeys: (keyof PlaygroundState)[]) => void;

export const ALL_WEBHOOK_EVENTS = [
  "payment.sent",
  "payment.received",
  "escrow.funded",
  "escrow.released",
  "escrow.cancelled",
  "escrow.claim_started",
  "tab.opened",
  "tab.charged",
  "tab.closed",
  "stream.opened",
  "stream.withdrawn",
  "stream.closed",
  "bounty.posted",
  "bounty.submitted",
  "bounty.awarded",
  "bounty.reclaimed",
  "bounty.expired",
  "deposit.created",
  "deposit.returned",
  "deposit.forfeited",
  "x402.settled",
  "x402.failed",
] as const;

// --- localStorage keys ---
const LS_VIEW = "pay-v1-view";
const LS_WEBHOOK_URL = "pay-v1-webhook-url";
const LS_WEBHOOK_EVENTS = "pay-v1-webhook-events";

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable - ignore
  }
}

function loadViewMode(): ViewMode {
  const stored = readLocalStorage(LS_VIEW);
  if (stored === "docs" || stored === "timeline") return stored;
  return "docs";
}

function loadNetwork(): "testnet" | "mainnet" {
  const params = new URLSearchParams(window.location.search);
  const net = params.get("network");
  if (net === "mainnet") return "mainnet";
  return "testnet";
}

function loadWebhookUrl(): string {
  return readLocalStorage(LS_WEBHOOK_URL) ?? "";
}

function loadWebhookEvents(): string[] {
  const raw = readLocalStorage(LS_WEBHOOK_EVENTS);
  if (!raw) return [...ALL_WEBHOOK_EVENTS];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((e) => typeof e === "string")) {
      return parsed as string[];
    }
  } catch {
    // Corrupt - fall back to all events
  }
  return [...ALL_WEBHOOK_EVENTS];
}

const INITIAL_STATE: PlaygroundState = {
  viewMode: loadViewMode(),
  activeFlowId: "direct",
  activeStepIndex: -1,
  flowStatus: "idle",
  network: loadNetwork(),
  agentBalance: null,
  providerBalance: null,
  webhookUrl: loadWebhookUrl(),
  webhookEvents: loadWebhookEvents(),
  webhookModalOpen: false,
  errorMessage: "",
  completedSteps: [],
};

let state: PlaygroundState = { ...INITIAL_STATE };

const listeners: Set<Listener> = new Set();

/** Returns a frozen copy of the current state. */
export function getState(): Readonly<PlaygroundState> {
  return Object.freeze({ ...state });
}

/** Merges partial updates into state, persists relevant keys, notifies listeners. */
export function setState(partial: Partial<PlaygroundState>): void {
  const changedKeys: (keyof PlaygroundState)[] = [];

  for (const key of Object.keys(partial) as (keyof PlaygroundState)[]) {
    const newVal = partial[key];
    const oldVal = state[key];
    // Shallow equality - arrays compared by reference (good enough for this use case)
    if (newVal !== oldVal) {
      changedKeys.push(key);
    }
  }

  if (changedKeys.length === 0) return;

  state = { ...state, ...partial };

  // Persist to localStorage
  if (changedKeys.includes("viewMode")) {
    writeLocalStorage(LS_VIEW, state.viewMode);
  }
  if (changedKeys.includes("webhookUrl")) {
    writeLocalStorage(LS_WEBHOOK_URL, state.webhookUrl);
  }
  if (changedKeys.includes("webhookEvents")) {
    writeLocalStorage(LS_WEBHOOK_EVENTS, JSON.stringify(state.webhookEvents));
  }

  // Notify listeners
  const frozen = Object.freeze({ ...state });
  for (const listener of listeners) {
    listener(frozen, changedKeys);
  }
}

/** Subscribe to state changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resets state to initial values, preserving persisted keys (network, viewMode, webhook settings). */
export function resetState(): void {
  setState({
    activeFlowId: "direct",
    activeStepIndex: -1,
    flowStatus: "idle",
    agentBalance: null,
    providerBalance: null,
    webhookModalOpen: false,
    errorMessage: "",
    completedSteps: [],
  });
}
