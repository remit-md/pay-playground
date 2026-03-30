/**
 * Header component for Playground V2.
 * Pixel-matches C4 mockup header (v2-mockups/C4-timeline-stripe.html).
 *
 * Structure:
 *   sticky top-0 z-50 bg-card/95 backdrop-blur border-b
 *   max-w-[1440px] container, h-14
 *   Left: logo + flow dropdown
 *   Center: view toggle (Docs / Timeline)
 *   Right: webhook gear + network dot + Run button
 */

import { getState, setState, subscribe } from "../state.js";
import { net, network, switchNetwork } from "../network.js";


export interface HeaderCallbacks {
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
}

export function buildHeader(
  container: HTMLElement,
  flows: { id: string; label: string }[],
  callbacks?: HeaderCallbacks,
): void {
  container.innerHTML = "";

  // ── Outer header ───────────────────────────────────────────
  const header = document.createElement("header");
  header.className = "sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border";

  const inner = document.createElement("div");
  inner.className = "max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between";

  // ── Left: Logo + Flow Selector ─────────────────────────────
  const left = document.createElement("div");
  left.className = "flex items-center gap-4";

  // Logo
  const logo = document.createElement("span");
  logo.className = "font-mono font-bold text-[15px] tracking-tight text-ink";
  logo.innerHTML = 'pay <span class="text-ink2 font-normal">playground</span>';
  left.appendChild(logo);

  // Flow selector dropdown (styled as pill)
  const flowWrap = document.createElement("div");
  flowWrap.className = "hidden sm:flex items-center gap-1 bg-bg border border-border rounded-lg px-2 py-1 text-[13px]";

  const flowLabel = document.createElement("span");
  flowLabel.className = "text-ink2";
  flowLabel.textContent = "Flow:";
  flowWrap.appendChild(flowLabel);

  const flowSelect = document.createElement("select");
  flowSelect.className = "font-semibold text-ink bg-transparent border-none outline-none cursor-pointer text-[13px] appearance-none pr-4";
  flowSelect.style.backgroundImage =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23717171'/%3E%3C/svg%3E\")";
  flowSelect.style.backgroundRepeat = "no-repeat";
  flowSelect.style.backgroundPosition = "right 0 center";

  for (const f of flows) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    flowSelect.appendChild(opt);
  }
  flowSelect.value = getState().activeFlowId;
  flowSelect.addEventListener("change", () => {
    setState({ activeFlowId: flowSelect.value });
  });

  flowWrap.appendChild(flowSelect);
  left.appendChild(flowWrap);

  // ── Center: View Toggle ────────────────────────────────────
  const viewToggle = document.createElement("div");
  viewToggle.className = "inline-flex items-center gap-1 bg-bg border border-border rounded-full px-1 py-0.5";

  const docsBtn = document.createElement("button");
  docsBtn.className = "view-toggle-btn";
  docsBtn.textContent = "Docs";
  docsBtn.addEventListener("click", () => setState({ viewMode: "docs" }));

  const timelineBtn = document.createElement("button");
  timelineBtn.className = "view-toggle-btn";
  timelineBtn.textContent = "Timeline";
  timelineBtn.addEventListener("click", () => setState({ viewMode: "timeline" }));

  function updateViewToggle(): void {
    const vm = getState().viewMode;
    docsBtn.classList.toggle("active", vm === "docs");
    timelineBtn.classList.toggle("active", vm === "timeline");
  }
  updateViewToggle();

  viewToggle.appendChild(docsBtn);
  viewToggle.appendChild(timelineBtn);

  // ── Right: Actions ─────────────────────────────────────────
  const right = document.createElement("div");
  right.className = "flex items-center gap-3";

  // Webhook gear button with badge dot
  const webhookBtn = document.createElement("button");
  webhookBtn.className = "hidden sm:flex items-center gap-1 text-[13px] text-ink2 hover:text-ink transition-colors relative";
  webhookBtn.innerHTML = "<span>&#9881;</span><span>Webhooks</span>";
  webhookBtn.addEventListener("click", () => setState({ webhookModalOpen: true }));

  const webhookDot = document.createElement("span");
  webhookDot.className = "absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-accent";
  webhookDot.style.display = getState().webhookUrl ? "" : "none";
  webhookBtn.appendChild(webhookDot);

  right.appendChild(webhookBtn);

  // Network toggle: pill toggle like view toggle (testnet ↔ mainnet)
  const isTestnet = network === "testnet";
  const netToggle = document.createElement("div");
  netToggle.className = "inline-flex items-center gap-0.5 bg-bg border border-border rounded-full px-0.5 py-0.5";

  const testnetBtn = document.createElement("button");
  testnetBtn.className = "net-toggle-btn flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all";
  testnetBtn.innerHTML = '<span class="inline-block w-1.5 h-1.5 rounded-full bg-green"></span> Sepolia';
  testnetBtn.addEventListener("click", () => { if (!isTestnet) switchNetwork("testnet"); });

  const mainnetBtn = document.createElement("button");
  mainnetBtn.className = "net-toggle-btn flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all";
  mainnetBtn.innerHTML = '<span class="inline-block w-1.5 h-1.5 rounded-full bg-orange"></span> Mainnet';
  mainnetBtn.addEventListener("click", () => { if (isTestnet) switchNetwork("mainnet"); });

  if (isTestnet) {
    testnetBtn.classList.add("bg-green/10", "text-ink");
    mainnetBtn.classList.add("text-ink2");
  } else {
    mainnetBtn.classList.add("bg-orange/10", "text-ink");
    testnetBtn.classList.add("text-ink2");
  }

  netToggle.appendChild(testnetBtn);
  netToggle.appendChild(mainnetBtn);
  right.appendChild(netToggle);

  // ── Flow control buttons: Step | Run | Reset ────────────
  const controlGroup = document.createElement("div");
  controlGroup.className = "flex items-center gap-1.5";

  // Step button
  const stepBtn = document.createElement("button");
  stepBtn.className = "flex items-center gap-1 bg-bg border border-border text-ink2 text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-border/50 transition-colors";
  stepBtn.innerHTML = "Step <span>&#9654;&#124;</span>";
  stepBtn.addEventListener("click", () => callbacks?.onStep());
  controlGroup.appendChild(stepBtn);

  // Run button
  const runBtn = document.createElement("button");
  runBtn.className = "flex items-center gap-1.5 bg-accent text-white text-[13px] font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity";
  runBtn.innerHTML = "Run <span>&#9654;</span>";
  runBtn.addEventListener("click", () => callbacks?.onRun());
  controlGroup.appendChild(runBtn);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "flex items-center gap-1 bg-bg border border-border text-ink2 text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-border/50 transition-colors";
  resetBtn.innerHTML = "Reset <span>&#8635;</span>";
  resetBtn.addEventListener("click", () => callbacks?.onReset());
  controlGroup.appendChild(resetBtn);

  right.appendChild(controlGroup);

  // Update button states based on flowStatus
  function updateFlowControls(): void {
    const s = getState();
    // Step: enabled when idle, paused, done, error - disabled when running
    stepBtn.disabled = s.flowStatus === "running";
    stepBtn.style.opacity = s.flowStatus === "running" ? "0.4" : "1";
    // Run: enabled when idle, done, error - disabled when running or paused
    runBtn.disabled = s.flowStatus === "running" || s.flowStatus === "paused";
    runBtn.style.opacity = runBtn.disabled ? "0.4" : "1";
    // Reset: enabled when paused, done, error - disabled when idle or running
    resetBtn.disabled = s.flowStatus === "idle" || s.flowStatus === "running";
    resetBtn.style.opacity = resetBtn.disabled ? "0.4" : "1";
  }
  updateFlowControls();

  // ── Assemble ───────────────────────────────────────────────
  inner.appendChild(left);
  inner.appendChild(viewToggle);
  inner.appendChild(right);
  header.appendChild(inner);

  // ── Flow pills row (C2 timeline view only) ────────────────
  const pillsRow = document.createElement("div");
  pillsRow.className = "max-w-[1440px] mx-auto px-4 sm:px-6 pb-2 flex items-center gap-2 overflow-x-auto";

  const pillButtons: HTMLElement[] = [];
  for (const f of flows) {
    const pill = document.createElement("span");
    pill.className = "flow-pill";
    pill.textContent = f.label;
    pill.style.cursor = "pointer";
    pill.addEventListener("click", () => setState({ activeFlowId: f.id }));
    pill.setAttribute("data-flow-id", f.id);
    pillButtons.push(pill);
    pillsRow.appendChild(pill);
  }

  function updatePills(): void {
    const activeId = getState().activeFlowId;
    for (const pill of pillButtons) {
      const isActive = pill.getAttribute("data-flow-id") === activeId;
      pill.classList.toggle("active", isActive);
    }
  }
  updatePills();

  // Flow pills visible in both views
  pillsRow.style.display = "";

  header.appendChild(pillsRow);
  container.appendChild(header);

  // ── Health check ───────────────────────────────────────────
  const activeNetBtn = isTestnet ? testnetBtn : mainnetBtn;
  checkHealth(activeNetBtn);

  // ── State subscriptions ────────────────────────────────────
  subscribe((state, changed) => {
    if (changed.includes("activeFlowId")) {
      if (flowSelect.value !== state.activeFlowId) {
        flowSelect.value = state.activeFlowId;
      }
      updatePills();
    }
    if (changed.includes("viewMode")) {
      updateViewToggle();
    }
    if (changed.includes("flowStatus")) {
      updateFlowControls();
    }
    if (changed.includes("webhookUrl")) {
      webhookDot.style.display = state.webhookUrl ? "" : "none";
    }
  });
}

/** Ping health endpoint and update connectivity indicator on the active network button. */
async function checkHealth(btn: HTMLElement): Promise<void> {
  try {
    const res = await fetch(`${net.apiUrl.replace(/\/api\/v\d+$/, "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      btn.title = "Connected";
    } else {
      btn.title = `Health check failed: HTTP ${res.status}`;
      btn.style.opacity = "0.5";
    }
  } catch {
    btn.title = "Cannot reach server";
    btn.style.opacity = "0.5";
  }
}
