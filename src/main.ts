// Polyfill Node.js Buffer for browser (SDK uses it globally)
import { Buffer as BufferShim } from "./shims/buffer.js";
(globalThis as Record<string, unknown>).Buffer = BufferShim;

/**
 * pay Playground V2 - entry point.
 * Initialises wallets, builds layout, wires up flow controls.
 */

import type { Wallet } from "@pay-skill/sdk";
import { loadOrCreateWallet } from "./wallet.js";
import { net, initContracts, mainnetUnavailable } from "./network.js";
import { getState, setState, subscribe } from "./state.js";
import { buildHeader } from "./components/header.js";
import { buildWalletBar } from "./components/wallet-bar.js";
import { buildWebhookModal } from "./components/webhook-modal.js";
import { buildNetworkLog } from "./components/network-log.js";
import { getAllFlows, getFlow } from "./flows/registry.js";
import { buildDocsView } from "./views/docs-view.js";
import type { DocsViewCallbacks } from "./views/docs-view.js";
import { buildTimelineView } from "./views/timeline-view.js";
import type { TimelineViewCallbacks } from "./views/timeline-view.js";
import { getSamples } from "./sdk-samples/index.js";
import type { FlowContext, StepResult } from "./flows/types.js";
import { exportAllSchemas, exportSchemaIndex } from "./flows/schema-export.js";

// ── Import all flows (self-registering) ──────────────────────────────────────

import "./flows/direct.js";
import "./flows/tab.js";
import "./flows/x402.js";
import "./flows/ap2-discovery.js";
import "./flows/ap2-payment.js";

// ── Import SDK samples (self-registering) ────────────────────────────────────
import "./sdk-samples/all.js";

// ── State ────────────────────────────────────────────────────────────────────

let agentWallet: Wallet;
let providerWallet: Wallet;
let networkLogApi: { refresh: () => void; clear: () => void };
let currentViewApi: {
  showStepResult: (i: number, r: StepResult) => void;
  setActiveStep: (i: number) => void;
  showBranch: (i: number, onSelect: (branchId: string) => void) => void;
  clear: () => void;
} | null = null;

/** Monotonically increasing counter - incremented on Run/Reset to signal abort to any in-flight execution. */
let runGeneration = 0;

// ── View containers ──────────────────────────────────────────────────────────

let viewContainer: HTMLElement;

// ── Init ─────────────────────────────────────────────────────────────────────

async function init(appRoot: HTMLElement): Promise<void> {
  await initContracts();

  if (mainnetUnavailable) {
    showMainnetBanner(appRoot);
    return;
  }

  agentWallet = loadOrCreateWallet(`${net.storagePrefix}-agent`);
  providerWallet = loadOrCreateWallet(`${net.storagePrefix}-provider`);

  buildLayout(appRoot);

  // Initial balance fetch
  try {
    const [ab, pb] = await Promise.all([
      agentWallet.balance(),
      providerWallet.balance(),
    ]);
    setState({ agentBalance: ab, providerBalance: pb });
  } catch {
    setState({ agentBalance: null, providerBalance: null });
  }
}

function showMainnetBanner(root: HTMLElement): void {
  root.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = "flex flex-col items-center justify-center h-screen gap-4 px-8 text-center";
  banner.innerHTML = `
    <h1 class="text-2xl font-bold text-ink">Base Mainnet Not Yet Available</h1>
    <p class="text-ink-muted max-w-lg">
      The mainnet server is not live yet. The API is currently serving Base Sepolia (testnet) only.
    </p>
    <a href="${window.location.pathname}"
       class="mt-4 px-6 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover transition-colors">
      Go to Testnet Playground
    </a>
  `;
  root.appendChild(banner);
}

// ── Layout ───────────────────────────────────────────────────────────────────

function buildLayout(root: HTMLElement): void {
  root.innerHTML = "";
  root.className = "flex flex-col h-screen";

  // Header (with Run button + view toggle)
  const headerEl = document.createElement("div");
  headerEl.className = "shrink-0";
  const flows = getAllFlows();
  buildHeader(headerEl, flows.map((f) => ({ id: f.id, label: f.label })), {
    onRun: () => void runFlow(),
    onStep: () => void stepFlow(),
    onReset: () => void resetFlow(),
  });
  root.appendChild(headerEl);

  // Wallet bar
  const walletBarEl = document.createElement("div");
  walletBarEl.className = "shrink-0";
  buildWalletBar(walletBarEl, agentWallet, providerWallet);
  root.appendChild(walletBarEl);

  // Main view container
  viewContainer = document.createElement("main");
  viewContainer.className = "flex-1 min-h-0 overflow-auto";
  root.appendChild(viewContainer);

  // Footer
  const footer = document.createElement("footer");
  footer.className = "border-t border-border mt-16";
  footer.innerHTML = `
    <div class="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-ink2">
      <span class="font-mono">pay &mdash; universal payments for AI agents</span>
      <div class="flex items-center gap-4">
        <a href="https://pay" class="hover:text-ink transition-colors">Docs</a>
        <a href="https://github.com/remit-md" class="hover:text-ink transition-colors">GitHub</a>
        <a href="https://pay/api/v1" class="hover:text-ink transition-colors">API Reference</a>
        <a href="/schemas/index.json" class="hover:text-ink transition-colors">Flow Schemas</a>
        <span>${net.label}</span>
      </div>
    </div>`;
  root.appendChild(footer);

  // Network log (sticky bottom)
  const networkLogEl = document.createElement("div");
  networkLogEl.className = "shrink-0";
  networkLogApi = buildNetworkLog(networkLogEl);
  root.appendChild(networkLogEl);

  // Webhook modal
  const modalEl = document.createElement("div");
  buildWebhookModal(modalEl, agentWallet, providerWallet);
  root.appendChild(modalEl);

  // Expose flow schemas as global for AI agents and the schema link
  (window as unknown as Record<string, unknown>).paySchemas = {
    index: exportSchemaIndex,
    all: exportAllSchemas,
  };

  // Wire the schema link to generate and open the JSON
  const schemaLink = footer.querySelector('a[href="/schemas/index.json"]');
  if (schemaLink) {
    schemaLink.addEventListener("click", (e) => {
      e.preventDefault();
      const json = JSON.stringify(exportAllSchemas(), null, 2);
      const blob = new Blob([json], { type: "application/json" });
      window.open(URL.createObjectURL(blob), "_blank");
    });
  }

  // Render initial view
  renderView();

  // Re-render view when viewMode or activeFlowId changes
  subscribe((_state, changed) => {
    if (changed.includes("viewMode") || changed.includes("activeFlowId")) {
      renderView();
    }
  });
}

// ── View rendering ───────────────────────────────────────────────────────────

function renderView(): void {
  viewContainer.innerHTML = "";
  currentViewApi = null;
  const state = getState();
  const flow = getFlow(state.activeFlowId);

  if (!flow) {
    viewContainer.innerHTML = `<div class="flex items-center justify-center h-full text-muted text-sm">
      Select a flow to begin.${getAllFlows().length === 0 ? " (No flows loaded yet)" : ""}
    </div>`;
    return;
  }

  const ctx: FlowContext = { agent: agentWallet, provider: providerWallet };

  const viewCallbacks: DocsViewCallbacks & TimelineViewCallbacks = {
    onRunStep: (i: number) => void runSingleStep(i),
    onSkipStep: (i: number) => void skipSingleStep(i),
  };

  if (state.viewMode === "timeline") {
    currentViewApi = buildTimelineView(viewContainer, flow, ctx, getSamples, viewCallbacks);
  } else {
    currentViewApi = buildDocsView(viewContainer, flow, ctx, getSamples, viewCallbacks);
  }
}

// ── Flow execution ───────────────────────────────────────────────────────────

async function runFlow(): Promise<void> {
  const state = getState();
  const flow = getFlow(state.activeFlowId);
  if (!flow || state.flowStatus === "running") return;

  const gen = ++runGeneration;
  setState({ flowStatus: "running", activeStepIndex: 0, errorMessage: "" });
  const ctx: FlowContext = { agent: agentWallet, provider: providerWallet };

  // Step IDs to skip (populated when a decision auto-selects the first branch)
  const skipStepIds = new Set<string>();

  for (let i = 0; i < flow.steps.length; i++) {
    // Abort if Reset/re-Run was called while we were executing
    if (runGeneration !== gen) return;

    const step = flow.steps[i];

    // Skip steps from unselected branches
    if (skipStepIds.has(step.id)) continue;

    // Decision steps: auto-select first branch, mark unselected branches for skip
    if (step.variant === "decision") {
      setState({ activeStepIndex: i });
      currentViewApi?.setActiveStep(i);

      if (step.branches && step.branchSteps) {
        const selectedBranchId = step.branches[0].id;
        // Collect step IDs from ALL other branches - those get skipped
        for (const [branchId, stepIds] of Object.entries(step.branchSteps)) {
          if (branchId !== selectedBranchId) {
            for (const sid of stepIds) skipStepIds.add(sid);
          }
        }
      }
      continue;
    }

    setState({ activeStepIndex: i });
    currentViewApi?.setActiveStep(i);

    try {
      const result = await step.action(ctx);

      // Re-check abort after async action completes
      if (runGeneration !== gen) return;

      currentViewApi?.showStepResult(i, result);
      networkLogApi.refresh();

      // Brief pause between steps for visual effect
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      if (runGeneration !== gen) return;
      const errorResult = {
        error: { message: err instanceof Error ? err.message : String(err) },
      };
      currentViewApi?.showStepResult(i, errorResult);
      setState({ flowStatus: "error", errorMessage: errorResult.error.message });
      networkLogApi.refresh();
      return;
    }
  }

  // Abort check before final state update
  if (runGeneration !== gen) return;

  // Refresh balances after flow completes
  try {
    const [ab, pb] = await Promise.all([agentWallet.balance(), providerWallet.balance()]);
    setState({ agentBalance: ab, providerBalance: pb });
  } catch { setState({ agentBalance: null, providerBalance: null }); }

  setState({ flowStatus: "done" });
  networkLogApi.refresh();
}

/** Step IDs to skip in step mode (populated when user selects a branch at a decision point). */
let stepSkipIds = new Set<string>();

async function stepFlow(): Promise<void> {
  const state = getState();
  const flow = getFlow(state.activeFlowId);
  if (!flow || state.flowStatus === "running") return;

  const gen = ++runGeneration;

  let nextIndex: number;
  if (state.flowStatus === "idle" || state.flowStatus === "done") {
    // Starting fresh
    stepSkipIds = new Set<string>();
    renderView();
    nextIndex = 0;
    setState({ flowStatus: "paused", activeStepIndex: nextIndex, errorMessage: "" });
  } else {
    nextIndex = state.activeStepIndex + 1;

    // Skip past steps from unselected branches
    while (nextIndex < flow.steps.length && stepSkipIds.has(flow.steps[nextIndex].id)) {
      nextIndex++;
    }

    if (nextIndex >= flow.steps.length) {
      setState({ flowStatus: "done" });
      return;
    }
    setState({ activeStepIndex: nextIndex });
  }

  const step = flow.steps[nextIndex];
  currentViewApi?.setActiveStep(nextIndex);

  // Decision steps: show branch buttons and pause - user selects a branch to continue
  if (step.variant === "decision") {
    if (step.branches && step.branchSteps && currentViewApi) {
      currentViewApi.showBranch(nextIndex, (selectedBranchId: string) => {
        // Mark unselected branch steps for skip
        if (step.branchSteps) {
          for (const [branchId, stepIds] of Object.entries(step.branchSteps)) {
            if (branchId !== selectedBranchId) {
              for (const sid of stepIds) stepSkipIds.add(sid);
            }
          }
        }
        // Auto-advance to next non-skipped step after branch selection
        void stepFlow();
      });
    }
    networkLogApi.refresh();
    return;
  }

  const ctx: FlowContext = { agent: agentWallet, provider: providerWallet };
  try {
    const result = await step.action(ctx);
    if (runGeneration !== gen) return;
    currentViewApi?.showStepResult(nextIndex, result);
  } catch (err) {
    if (runGeneration !== gen) return;
    currentViewApi?.showStepResult(nextIndex, {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
    setState({ flowStatus: "error", errorMessage: err instanceof Error ? err.message : String(err) });
  }

  // Refresh balances + network log
  if (runGeneration !== gen) return;
  try {
    const [ab, pb] = await Promise.all([agentWallet.balance(), providerWallet.balance()]);
    setState({ agentBalance: ab, providerBalance: pb });
  } catch { setState({ agentBalance: null, providerBalance: null }); }
  networkLogApi.refresh();
}

/** Execute a single step by index (called from per-card "Run Step" buttons). */
async function runSingleStep(stepIndex: number): Promise<void> {
  const state = getState();
  const flow = getFlow(state.activeFlowId);
  if (!flow || stepIndex < 0 || stepIndex >= flow.steps.length) return;

  const step = flow.steps[stepIndex];
  if (step.variant === "decision" || step.variant === "webhook") return;

  const gen = ++runGeneration;
  setState({ flowStatus: "running", activeStepIndex: stepIndex });
  currentViewApi?.setActiveStep(stepIndex);

  const ctx: FlowContext = { agent: agentWallet, provider: providerWallet };
  try {
    const result = await step.action(ctx);
    if (runGeneration !== gen) return;
    currentViewApi?.showStepResult(stepIndex, result);
    setState({
      flowStatus: "paused",
      completedSteps: [...getState().completedSteps, stepIndex],
    });
  } catch (err) {
    if (runGeneration !== gen) return;
    currentViewApi?.showStepResult(stepIndex, {
      error: { message: err instanceof Error ? err.message : String(err) },
    });
    setState({ flowStatus: "error", errorMessage: err instanceof Error ? err.message : String(err) });
  }

  // Refresh balances + network log
  if (runGeneration !== gen) return;
  try {
    const [ab, pb] = await Promise.all([agentWallet.balance(), providerWallet.balance()]);
    setState({ agentBalance: ab, providerBalance: pb });
  } catch { setState({ agentBalance: null, providerBalance: null }); }
  networkLogApi.refresh();

  // Auto-execute following webhook steps
  if (runGeneration !== gen) return;
  for (let next = stepIndex + 1; next < flow.steps.length; next++) {
    const nextStep = flow.steps[next];
    if (nextStep.variant !== "webhook") break;
    try {
      const result = await nextStep.action(ctx);
      if (runGeneration !== gen) return;
      currentViewApi?.showStepResult(next, result);
      setState({ completedSteps: [...getState().completedSteps, next] });
    } catch { break; }
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Skip an optional step (marks as done without executing). */
function skipSingleStep(stepIndex: number): void {
  const flow = getFlow(getState().activeFlowId);
  if (!flow || stepIndex < 0 || stepIndex >= flow.steps.length) return;
  const step = flow.steps[stepIndex];
  if (!step.optional) return;

  const skipResult: StepResult = {
    request: { method: "SKIPPED", url: step.id },
    response: { skipped: true, reason: "Pay handles this automatically" },
    timeMs: 0,
  };
  currentViewApi?.showStepResult(stepIndex, skipResult);
  setState({
    flowStatus: "paused",
    activeStepIndex: stepIndex,
    completedSteps: [...getState().completedSteps, stepIndex],
  });
}

async function resetFlow(): Promise<void> {
  ++runGeneration; // Signal abort to any in-flight execution
  stepSkipIds = new Set<string>();
  setState({ flowStatus: "idle", activeStepIndex: -1, errorMessage: "" });
  networkLogApi.clear();
  try {
    const [ab, pb] = await Promise.all([agentWallet.balance(), providerWallet.balance()]);
    setState({ agentBalance: ab, providerBalance: pb });
  } catch { setState({ agentBalance: null, providerBalance: null }); }
  renderView();
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

const appRoot = document.getElementById("app");
if (!appRoot) throw new Error("No #app element");

void init(appRoot).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[playground] init failed:", err);
  appRoot.innerHTML = "";
  const banner = document.createElement("div");
  banner.className = "flex flex-col items-center justify-center h-screen gap-4 px-8 text-center";
  banner.innerHTML = `
    <h1 class="text-2xl font-bold text-red-600">Failed to Initialize</h1>
    <p class="text-ink-muted max-w-lg">The playground could not connect to the API. This usually means the server is down or unreachable.</p>
    <pre class="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-lg overflow-auto">${msg}</pre>
    <button onclick="location.reload()" class="mt-4 px-6 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity">Retry</button>
  `;
  appRoot.appendChild(banner);
});
