/**
 * Stripe-style documentation view (C4).
 *
 * HTML structure pixel-matches the C4 mockup (v2-mockups/C4-timeline-stripe.html).
 * All custom CSS classes are defined in styles.css.
 *
 * Layout:
 *   Left (55%): numbered step badges with vertical connector line, prose, SDK tab bar + dark code block
 *   Right (45%, sticky top:120px): response panel with step counter, network timing, Request/Response/Headers tabs, JSON viewer, Copy button
 *
 * Mobile (<768px): single column, right panel inlines below steps.
 */

import type { FlowSpec, FlowContext, StepResult, StepSpec, FlowState } from "../flows/types.js";
import type { SdkSample } from "../sdk-samples/types.js";
import { SDK_LANGUAGES } from "../sdk-samples/types.js";
import { setState, subscribe } from "../state.js";
import { highlightCode, highlightJson as hlJson } from "../highlight.js";

/* ── Public API ──────────────────────────────────────────────────── */

export interface DocsViewApi {
  showStepResult(stepIndex: number, result: StepResult): void;
  setActiveStep(stepIndex: number): void;
  showBranch(stepIndex: number, onSelect: (branchId: string) => void): void;
  clear(): void;
}

export interface DocsViewCallbacks {
  onRunStep?: (stepIndex: number) => void;
  onSkipStep?: (stepIndex: number) => void;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function h(tag: string, className: string, innerHTML?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML !== undefined) el.innerHTML = innerHTML;
  return el;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function highlightJson(obj: unknown): string {
  return hlJson(obj);
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function requestSummary(req: StepResult["request"]): { method: string; path: string } | null {
  if (!req) return null;
  const method = req.method.toUpperCase();
  let path: string;
  try {
    path = new URL(req.url).pathname;
  } catch {
    path = req.url;
  }
  return { method, path };
}

function responseStatus(result: StepResult): number | null {
  if (result.error?.status) return result.error.status;
  if (result.response && typeof result.response === "object") {
    const r = result.response as Record<string, unknown>;
    if (typeof r["statusCode"] === "number") return r["statusCode"];
  }
  return result.error ? null : 200;
}

/* ── Step badge color by role ────────────────────────────────────── */

function badgeClasses(step: StepSpec): string {
  if (step.role === "agent") return "bg-accent text-white";
  if (step.role === "provider") return "bg-orange text-white";
  return "bg-ink2/10 text-ink2"; // system
}

/* ── External link SVG ───────────────────────────────────────────── */

const EXTERNAL_SVG = "&#8599;";

/* ── State Diagram (inline pills - C4 style) ─────────────────────── */

/** Per-state color palette - matches C4 mockup (accent, orange, green, ink2). */
const STATE_COLORS_C4 = ["accent", "orange", "green", "indigo", "accent", "orange", "green"];

function stateColorC4(index: number): string {
  return STATE_COLORS_C4[index % STATE_COLORS_C4.length];
}

function renderStateDiagramC4(states: FlowState[], _currentId?: string): HTMLElement {
  const wrap = h("div", "mb-8 flex items-center gap-1 flex-wrap");

  // Find the last non-terminal state to insert "or" before terminal branches
  const lastNonTerminalIdx = states.length - 1 - [...states].reverse().findIndex((s) => !s.terminal);

  for (let i = 0; i < states.length; i++) {
    // Insert "or" before terminal branch states
    if (i > 0 && states[i].terminal && i > lastNonTerminalIdx) {
      wrap.appendChild(h("span", "text-ink2 text-[12px] ml-3", "or"));
    } else if (i > 0) {
      wrap.appendChild(h("span", "state-arrow", "\u2192"));
    }

    const s = states[i];
    const color = stateColorC4(i);

    const node = h("span", `state-node bg-${color}/10 text-${color} border border-${color}/20`);
    node.textContent = s.label;
    node.setAttribute("data-state-id", s.id);
    node.setAttribute("data-state-idx", String(i));
    wrap.appendChild(node);
  }

  return wrap;
}

function updateStateDiagramC4(container: HTMLElement, currentId: string): void {
  const nodes = container.querySelectorAll<HTMLElement>("[data-state-id]");
  nodes.forEach((node) => {
    const idx = parseInt(node.getAttribute("data-state-idx") ?? "0", 10);
    const color = stateColorC4(idx);
    const id = node.getAttribute("data-state-id");
    if (id === currentId) {
      node.className = `state-node current bg-${color}/10 text-${color} border border-${color}/20 font-bold`;
    } else {
      node.className = `state-node bg-${color}/10 text-${color} border border-${color}/20`;
    }
  });
}

/* ── SDK Tabs (C4 style - underline, in bordered card) ───────────── */

function buildSdkTabsC4(samples: SdkSample[]): HTMLElement {
  const card = h("div", "border border-border rounded-xl overflow-hidden bg-card");

  // Tab bar
  const tabBar = h("div", "flex border-b border-border overflow-x-auto text-[12px]");
  const codeWrap = h("div", "p-4 bg-[#1A1A1A] text-[13px] leading-relaxed overflow-x-auto");

  const languages = SDK_LANGUAGES;
  let activeIdx = 0;

  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    const btn = document.createElement("button");
    btn.className = i === 0
      ? "sdk-tab-c4 active px-3 py-2 font-semibold whitespace-nowrap"
      : "sdk-tab-c4 px-3 py-2 whitespace-nowrap";
    btn.textContent = lang.displayName;
    btn.addEventListener("click", () => {
      tabBar.querySelectorAll(".sdk-tab-c4").forEach((t) => t.classList.remove("active", "font-semibold"));
      btn.classList.add("active", "font-semibold");
      activeIdx = i;
      renderCode();
    });
    tabBar.appendChild(btn);
  }

  function renderCode(): void {
    const lang = languages[activeIdx];
    const sample = samples.find((s) => s.lang === lang.lang);
    if (sample) {
      const highlighted = highlightCode(sample.code, lang.lang);
      codeWrap.innerHTML = `<pre class="code-block text-[#E8E8E4]" style="background:transparent;padding:0;border-radius:0;">${highlighted}</pre>`;
    } else {
      codeWrap.innerHTML = `<pre class="code-block text-[#E8E8E4]" style="background:transparent;padding:0;border-radius:0;"><span class="text-ink2">// ${esc(lang.displayName)} sample coming soon</span></pre>`;
    }
  }

  renderCode();
  card.appendChild(tabBar);
  card.appendChild(codeWrap);

  return card;
}

/* ── Response Panel (right column) ───────────────────────────────── */

type PanelTab = "request" | "response" | "headers";

function buildResponsePanel(): {
  element: HTMLElement;
  update: (stepIndex: number, totalSteps: number, result: StepResult | null) => void;
} {
  const panel = h("div", "border border-border rounded-xl overflow-hidden bg-card shadow-sm");

  // Panel header
  const panelHeader = h("div", "flex items-center justify-between px-4 py-3 border-b border-border bg-bg/50");
  const stepLabel = h("span", "text-[13px] font-semibold text-ink");
  const statusArea = h("div", "flex items-center gap-2 text-[12px]");
  panelHeader.appendChild(stepLabel);
  panelHeader.appendChild(statusArea);
  panel.appendChild(panelHeader);

  // Network timing
  const networkTiming = h("div", "px-4 py-2 border-b border-border bg-bg/30");
  const networkCode = h("code", "font-mono text-[12px] text-ink2");
  networkTiming.appendChild(networkCode);
  panel.appendChild(networkTiming);

  // Tabs
  const tabBar = h("div", "flex border-b border-border text-[12px]");
  const tabs: PanelTab[] = ["request", "response", "headers"];
  const tabLabels: Record<PanelTab, string> = { request: "Request", response: "Response", headers: "Headers" };
  const tabButtons: HTMLElement[] = [];
  let activeTab: PanelTab = "response";

  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.className = tab === "response"
      ? "response-tab active px-4 py-2 font-semibold"
      : "response-tab px-4 py-2 font-semibold";
    btn.textContent = tabLabels[tab];
    btn.addEventListener("click", () => {
      activeTab = tab;
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderBody();
    });
    tabButtons.push(btn);
    tabBar.appendChild(btn);
  }
  panel.appendChild(tabBar);

  // Response body
  const bodyWrap = h("div", "p-4 bg-[#1A1A1A] overflow-x-auto max-h-[560px] overflow-y-auto");
  const bodyPre = document.createElement("pre");
  bodyPre.className = "code-block text-[13px] leading-relaxed text-[#E8E8E4]";
  bodyPre.style.background = "transparent";
  bodyPre.style.padding = "0";
  bodyPre.style.borderRadius = "0";
  bodyWrap.appendChild(bodyPre);
  panel.appendChild(bodyWrap);

  // Panel footer
  const footer = h("div", "flex items-center justify-between px-4 py-2.5 border-t border-border bg-bg/50 text-[12px]");
  const contentType = h("span", "text-ink2", "Content-Type: application/json");
  const copyBtn = document.createElement("button");
  copyBtn.className = "text-accent hover:text-accent/80 transition-colors font-semibold flex items-center gap-1";
  copyBtn.innerHTML = "Copy &#9112;";
  copyBtn.addEventListener("click", () => {
    const text = bodyPre.textContent ?? "";
    navigator.clipboard.writeText(text).catch(() => {});
  });
  footer.appendChild(contentType);
  footer.appendChild(copyBtn);
  panel.appendChild(footer);

  // State
  let currentResult: StepResult | null = null;

  function renderBody(): void {
    if (!currentResult) {
      bodyPre.innerHTML = '<span class="text-ink2">// Run the flow to see real data</span>';
      return;
    }
    const r = currentResult;
    if (activeTab === "request") {
      bodyPre.innerHTML = r.request ? highlightJson(r.request.body ?? r.request) : '<span class="text-ink2">// No request data</span>';
    } else if (activeTab === "response") {
      if (r.error) {
        bodyPre.innerHTML = `<span class="text-orange">Error ${r.error.status ?? ""}</span>\n${esc(r.error.message)}`;
      } else {
        bodyPre.innerHTML = r.response ? highlightJson(r.response) : '<span class="text-ink2">// No response data</span>';
      }
    } else {
      // headers
      bodyPre.innerHTML = r.request?.headers ? highlightJson(r.request.headers) : '<span class="text-ink2">// No headers captured</span>';
    }
  }

  function update(stepIndex: number, totalSteps: number, result: StepResult | null): void {
    currentResult = result;
    stepLabel.innerHTML = `Step ${stepIndex + 1} <span class="text-ink2 font-normal">of ${totalSteps}</span>`;

    if (result) {
      const status = responseStatus(result);
      const isError = result.error != null;
      const timeStr = result.timeMs != null ? fmtMs(result.timeMs) : "";

      statusArea.innerHTML = "";
      if (status !== null) {
        const statusBadge = h("span", `inline-flex items-center gap-1 ${isError ? "text-orange" : "text-green"} font-mono font-semibold`);
        statusBadge.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full ${isError ? "bg-orange" : "bg-green"}"></span>${status}`;
        statusArea.appendChild(statusBadge);
      }
      if (timeStr) {
        statusArea.appendChild(h("span", "text-ink2", timeStr));
      }

      // Network timing line
      const req = requestSummary(result.request);
      if (req) {
        const statusNum = status ?? "ERR";
        const statusColor = isError ? "text-orange" : "text-green";
        networkCode.innerHTML = `<span class="text-accent font-semibold">${esc(req.method)}</span> ${esc(req.path)} <span class="text-ink2">\u2192</span> <span class="${statusColor} font-semibold">${statusNum}</span> <span class="text-ink2">(${timeStr})</span>`;
      } else {
        networkCode.textContent = "Completed";
      }

      networkTiming.style.display = "";
    } else {
      statusArea.innerHTML = '<span class="text-ink2">Waiting...</span>';
      networkTiming.style.display = "none";
    }

    renderBody();
  }

  // Initial state
  update(0, 1, null);

  return { element: panel, update };
}

/* ── Build the full docs view ────────────────────────────────────── */

export function buildDocsView(
  container: HTMLElement,
  flow: FlowSpec,
  ctx: FlowContext,
  getSamples: (flowId: string, stepId: string) => SdkSample[],
  callbacks?: DocsViewCallbacks,
): DocsViewApi {

  // Per-step tracking
  const results: (StepResult | null)[] = new Array(flow.steps.length).fill(null);
  let selectedStep = 0;
  let unsubscribe: (() => void) | null = null;

  // Step section elements for scroll + highlight
  const stepSections: HTMLElement[] = [];
  const branchSlots: (HTMLElement | null)[] = [];

  container.innerHTML = "";

  // ── Main ─────────────────────────────────────────────────────
  const main = h("main", "max-w-[1440px] mx-auto px-4 sm:px-6 py-8");

  // ── State Diagram ────────────────────────────────────────────
  const initialStateId = flow.states.length > 0 ? flow.states[0].id : undefined;
  const diagramEl = renderStateDiagramC4(flow.states, initialStateId);
  main.appendChild(diagramEl);

  // ── Two-Column Layout ────────────────────────────────────────
  const cols = h("div", "flex gap-8 desktop-cols");
  cols.style.flexDirection = "row";

  // ── Left Column: Tutorial Steps ──────────────────────────────
  const leftCol = h("div", "left-col");
  leftCol.style.width = "55%";
  leftCol.style.flexShrink = "0";

  // Track step run/skip buttons for enabling/disabling
  const stepRunBtns: (HTMLButtonElement | null)[] = [];
  const stepSkipBtns: (HTMLButtonElement | null)[] = [];

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const isLast = i === flow.steps.length - 1;
    const isWebhook = step.variant === "webhook";
    const isOptional = step.optional === true;
    const samples = getSamples(flow.id, step.id);

    // Webhook steps in docs view: passive annotation, not a full step card
    if (isWebhook) {
      const annotation = h("div", `relative ${isLast ? "mb-4" : "mb-12"}`);
      annotation.setAttribute("data-step-section", String(i));

      if (!isLast) {
        annotation.appendChild(h("div", "step-connector"));
      }

      const row = h("div", "flex gap-4");
      const badge = h("div", "step-badge bg-orange/10 text-orange relative z-10", "&#128236;");
      row.appendChild(badge);

      const content = h("div", "flex-1 min-w-0");
      const webhookNote = h("div", "border border-dashed border-orange/40 bg-[#FFF9F0] rounded-lg px-4 py-2.5");

      // Extract event name from label (e.g., "Webhook: escrow.funded" → "escrow.funded")
      const eventName = step.label.replace(/^Webhook:\s*/i, "");
      webhookNote.innerHTML = `<span class="text-[13px] font-mono font-semibold text-orange">${esc(eventName)}</span>` +
        `<span class="text-[12px] text-ink2 ml-2">fires at this point</span>` +
        `<button class="text-[11px] text-accent hover:text-accent/80 font-semibold ml-2 transition-colors">Configure &rarr;</button>`;
      webhookNote.style.cursor = "pointer";

      // Click opens webhook modal
      const configBtn = webhookNote.querySelector("button");
      if (configBtn) {
        configBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          setState({ webhookModalOpen: true });
        });
      }

      content.appendChild(webhookNote);
      row.appendChild(content);
      annotation.appendChild(row);

      stepSections.push(annotation);
      branchSlots.push(null);
      stepRunBtns.push(null);
      stepSkipBtns.push(null);
      leftCol.appendChild(annotation);
      continue;
    }

    const section = h("div", `relative ${isLast ? "mb-4" : "mb-12"} ${isOptional ? "optional-step" : ""}`);
    section.setAttribute("data-step-section", String(i));

    // Optional step: dashed left border
    if (isOptional) {
      section.style.borderLeft = "2px dashed #E8E8E4";
      section.style.paddingLeft = "8px";
      section.style.marginLeft = "-10px";
    }

    // Step connector line (not on last step)
    if (!isLast) {
      section.appendChild(h("div", "step-connector"));
    }

    const row = h("div", "flex gap-4");

    // Step badge
    const badge = h("div", `step-badge ${badgeClasses(step)} relative z-10`, String(i + 1));
    row.appendChild(badge);

    // Content column
    const content = h("div", "flex-1 min-w-0");

    // Title row with optional badge + action buttons in top-right
    const titleRow = h("div", "flex items-start justify-between mb-1");
    const titleLeft = h("div", "flex items-center gap-2");
    titleLeft.appendChild(h("h2", "text-[18px] font-bold text-ink", esc(step.label)));

    if (isOptional) {
      titleLeft.appendChild(h("span", "text-[10px] uppercase tracking-wider font-semibold text-ink2 bg-bg border border-border rounded-full px-2 py-0.5", "Optional"));
    }
    titleRow.appendChild(titleLeft);

    // Top-right: action buttons + source link
    const titleRight = h("div", "flex items-center gap-2 shrink-0");

    // Per-card step buttons (top-right corner)
    const isFirst = i === 0;
    const runStepBtn = document.createElement("button");
    runStepBtn.className = "flex items-center gap-1 bg-accent/10 text-accent border border-accent/20 text-[11px] font-semibold px-2.5 py-1 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
    runStepBtn.innerHTML = "&#9654; Run";
    runStepBtn.disabled = !isFirst;
    runStepBtn.addEventListener("click", () => callbacks?.onRunStep?.(i));
    titleRight.appendChild(runStepBtn);
    stepRunBtns.push(runStepBtn);

    if (isOptional) {
      const skipBtn = document.createElement("button");
      skipBtn.className = "text-[11px] text-ink2 border border-border px-2.5 py-1 rounded-md hover:bg-border/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
      skipBtn.textContent = "Skip";
      skipBtn.disabled = !isFirst;
      skipBtn.addEventListener("click", () => callbacks?.onSkipStep?.(i));
      titleRight.appendChild(skipBtn);
      stepSkipBtns.push(skipBtn);
    } else {
      stepSkipBtns.push(null);
    }

    if (step.sourceFile) {
      const link = document.createElement("a");
      link.className = "text-[12px] text-ink2 hover:text-accent transition-colors flex items-center gap-1";
      link.href = `https://github.com/remit-md/remit-playground/blob/main/${step.sourceFile}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.innerHTML = `View on GitHub ${EXTERNAL_SVG}`;
      titleRight.appendChild(link);
    }
    titleRow.appendChild(titleRight);
    content.appendChild(titleRow);

    // Description
    content.appendChild(h("p", "text-[14px] text-ink2 leading-relaxed mb-2", esc(step.description)));

    // RFC 2119 annotation
    if (step.rfc2119) {
      const rfcEl = h("p", "text-[11px] font-mono text-ink2/70 mb-4");
      const keyword = step.rfc2119;
      const colorClass = keyword === "MUST" ? "text-accent" : keyword === "MAY" ? "text-green" : "text-orange";
      rfcEl.innerHTML = `<span class="${colorClass} font-bold">${esc(keyword)}</span> <span class="text-ink2/50">(RFC 2119)</span>`;
      if (isOptional) {
        rfcEl.innerHTML += ` &mdash; <span class="text-ink2/50">Pay handles this automatically if skipped</span>`;
      }
      content.appendChild(rfcEl);
    } else {
      content.appendChild(h("div", "mb-2"));
    }

    // Field-level RFC 2119 input annotations (from OpenAPI spec)
    if (step.inputFields && step.inputFields.length > 0) {
      const fieldDetails = document.createElement("details");
      fieldDetails.className = "mb-4";
      const fieldSummary = document.createElement("summary");
      fieldSummary.className = "text-[11px] font-mono text-ink2/70 font-semibold cursor-pointer";
      fieldSummary.textContent = "Input Fields (RFC 2119)";
      fieldDetails.appendChild(fieldSummary);

      const fieldList = h("div", "mt-2 space-y-1 text-[11px] font-mono");
      for (const f of step.inputFields) {
        const isReq = f.keyword === "REQUIRED" || f.keyword === "MUST";
        const kwColor = isReq ? "text-accent" : "text-green";
        const fieldRow = h("div", "flex items-start gap-2 py-0.5");
        fieldRow.innerHTML = `<code class="text-ink font-bold shrink-0">${esc(f.field)}</code><span class="${kwColor} font-bold shrink-0">${esc(f.keyword)}</span><span class="text-ink2/60">${esc(f.note)}</span>`;
        fieldList.appendChild(fieldRow);
      }
      fieldDetails.appendChild(fieldList);
      content.appendChild(fieldDetails);
    }

    // Decision buttons slot (hidden by default)
    if (step.branches) {
      const branchSlot = h("div", "flex gap-2 mb-4 hidden");
      branchSlot.setAttribute("data-branch-slot", String(i));
      branchSlots.push(branchSlot);
      content.appendChild(branchSlot);
    } else {
      branchSlots.push(null);
    }

    // SDK tabs (C4 style - bordered card with underline tabs)
    content.appendChild(buildSdkTabsC4(samples));

    row.appendChild(content);
    section.appendChild(row);

    // Click handler to select step in right panel
    section.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("a") || target.closest("input")) return;
      selectStep(i);
    });

    stepSections.push(section);
    leftCol.appendChild(section);
  }

  cols.appendChild(leftCol);

  // ── Right Column: Sticky Response Panel ──────────────────────
  const rightCol = h("div", "right-col");
  rightCol.style.width = "45%";
  rightCol.style.position = "sticky";
  rightCol.style.top = "120px";
  rightCol.style.alignSelf = "flex-start";

  const { element: panelEl, update: updatePanel } = buildResponsePanel();
  updatePanel(0, flow.steps.length, null);
  rightCol.appendChild(panelEl);

  // Transaction Summary card (C4 mockup lines 401-422)
  const txSummaryCard = h("div", "mt-4 border border-border rounded-xl bg-card p-4");
  txSummaryCard.style.display = "none";
  const txSummaryTitle = h("div", "text-[12px] font-semibold text-ink mb-3 uppercase tracking-wider", "Transaction Summary");
  const txSummaryBody = h("div", "space-y-2 text-[13px]");
  txSummaryCard.appendChild(txSummaryTitle);
  txSummaryCard.appendChild(txSummaryBody);
  rightCol.appendChild(txSummaryCard);

  // Confirmations card (C4 mockup lines 424-451)
  const confirmCard = h("div", "mt-4 border border-border rounded-xl bg-card p-4");
  confirmCard.style.display = "none";
  const confirmTitle = h("div", "text-[12px] font-semibold text-ink mb-3 uppercase tracking-wider", "Confirmations");
  const confirmBody = h("div", "space-y-2.5");
  confirmCard.appendChild(confirmTitle);
  confirmCard.appendChild(confirmBody);
  rightCol.appendChild(confirmCard);

  cols.appendChild(rightCol);
  main.appendChild(cols);
  container.appendChild(main);

  // ── State subscription ───────────────────────────────────────
  unsubscribe = subscribe((state, changed) => {
    if (changed.includes("activeStepIndex") && flow.states.length > 0) {
      const idx = Math.min(Math.max(state.activeStepIndex, 0), flow.states.length - 1);
      updateStateDiagramC4(diagramEl, flow.states[idx].id);
    }
  });

  // ── Internal helpers ─────────────────────────────────────────

  function selectStep(index: number): void {
    if (index < 0 || index >= flow.steps.length) return;

    // Unhighlight previous
    for (const sec of stepSections) {
      sec.style.backgroundColor = "";
    }

    selectedStep = index;
    stepSections[index].style.backgroundColor = "rgba(42, 191, 171, 0.04)";

    updatePanel(index, flow.steps.length, results[index]);
  }

  // ── API ──────────────────────────────────────────────────────

  function showStepResult(stepIndex: number, result: StepResult): void {
    if (stepIndex < 0 || stepIndex >= flow.steps.length) return;
    results[stepIndex] = result;

    // Disable the completed step's button, enable the next one
    const completedBtn = stepRunBtns[stepIndex];
    if (completedBtn) {
      completedBtn.disabled = true;
      completedBtn.innerHTML = "&#10003; Done";
      completedBtn.className = "flex items-center gap-1.5 bg-green/10 text-green border border-green/20 text-[12px] font-semibold px-3 py-1 rounded-lg cursor-default";
    }

    // Hide skip button after step completes (either run or skipped)
    const completedSkip = stepSkipBtns[stepIndex];
    if (completedSkip) {
      completedSkip.style.display = "none";
    }

    // Enable next non-webhook step's run + skip buttons
    for (let next = stepIndex + 1; next < flow.steps.length; next++) {
      const nextBtn = stepRunBtns[next];
      if (nextBtn) {
        nextBtn.disabled = false;
        const nextSkip = stepSkipBtns[next];
        if (nextSkip) nextSkip.disabled = false;
        break;
      }
    }

    // If currently selected, refresh panel
    if (selectedStep === stepIndex) {
      updatePanel(stepIndex, flow.steps.length, result);
    }

    // Auto-select first result
    if (selectedStep === -1 || selectedStep === 0) {
      selectStep(stepIndex);
    }

    // Update Transaction Summary + Confirmations cards
    updateTxSummary(result);
    updateConfirmations(stepIndex);
  }

  function updateTxSummary(result: StepResult): void {
    const resp = result.response as Record<string, unknown> | undefined;
    if (!resp) return;

    const amount = resp.amount as number | undefined;
    const fees = resp.fees as Record<string, unknown> | undefined;
    if (amount == null && fees == null) return;

    txSummaryCard.style.display = "";
    const rows: string[] = [];

    if (amount != null) {
      rows.push(`<div class="flex justify-between"><span class="text-ink2">Amount</span><span class="font-mono font-semibold text-ink">${Number(amount).toFixed(2)} USDC</span></div>`);
    }
    if (fees) {
      const rate = fees.rate as string | undefined;
      const feeAmt = fees.amount as number | undefined;
      const net = fees.net as number | undefined;
      if (rate != null && feeAmt != null) {
        rows.push(`<div class="flex justify-between"><span class="text-ink2">Protocol Fee (${esc(rate)})</span><span class="font-mono text-ink2">${Number(feeAmt).toFixed(2)} USDC</span></div>`);
      }
      rows.push('<div class="border-t border-border my-2"></div>');
      if (net != null) {
        rows.push(`<div class="flex justify-between"><span class="text-ink2">Provider Receives</span><span class="font-mono font-bold text-green">${Number(net).toFixed(2)} USDC</span></div>`);
      }
    }
    txSummaryBody.innerHTML = rows.join("\n");
  }

  function updateConfirmations(completedIdx: number): void {
    confirmCard.style.display = "";
    const items: string[] = [];

    // Show completed steps as checked
    for (let i = 0; i <= completedIdx && i < flow.steps.length; i++) {
      const r = results[i];
      if (!r) continue;
      const label = flow.steps[i].label;
      const timeStr = r.timeMs != null ? `<span class="text-ink2 ml-auto font-mono text-[12px]">${fmtMs(r.timeMs)}</span>` : "";
      items.push(`<div class="flex items-center gap-2.5 text-[13px]"><span class="text-green">\u2713</span><span class="text-ink">${esc(label)}</span>${timeStr}</div>`);
    }

    // Show remaining steps as pending
    for (let i = completedIdx + 1; i < flow.steps.length; i++) {
      const label = flow.steps[i].label;
      items.push(`<div class="flex items-center gap-2.5 text-[13px]"><span class="text-ink2">\u25CB</span><span class="text-ink2">${esc(label)}</span></div>`);
    }

    confirmBody.innerHTML = items.join("\n");
  }

  function setActiveStep(stepIndex: number): void {
    if (stepIndex < 0 || stepIndex >= flow.steps.length) return;

    selectStep(stepIndex);
    stepSections[stepIndex].scrollIntoView({ behavior: "smooth", block: "center" });

    // Update state diagram
    if (flow.states.length > 0) {
      const stateIdx = Math.min(stepIndex, flow.states.length - 1);
      updateStateDiagramC4(diagramEl, flow.states[stateIdx].id);
    }
  }

  function showBranch(
    stepIndex: number,
    onSelect: (branchId: string) => void,
  ): void {
    const step = flow.steps[stepIndex];
    if (!step?.branches) return;

    const slot = stepSections[stepIndex].querySelector(`[data-branch-slot="${stepIndex}"]`);
    if (!slot) return;

    slot.innerHTML = "";
    slot.classList.remove("hidden");

    for (const branch of step.branches) {
      const btn = document.createElement("button");
      const isPrimary = branch.style === "primary";
      btn.className = isPrimary
        ? "flex items-center gap-1.5 bg-green/10 text-green border border-green/20 text-[13px] font-semibold px-4 py-1.5 rounded-lg"
        : "flex items-center gap-1.5 bg-ink2/5 text-ink2 border border-border text-[13px] font-semibold px-4 py-1.5 rounded-lg";
      btn.innerHTML = `${branch.icon ? `<span>${esc(branch.icon)}</span>` : ""} ${esc(branch.label)}`;
      btn.addEventListener("click", () => {
        slot.classList.add("hidden");
        onSelect(branch.id);
      });
      slot.appendChild(btn);
    }

    stepSections[stepIndex].scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clear(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    container.innerHTML = "";
    results.fill(null);
    stepSections.length = 0;
    branchSlots.length = 0;
    txSummaryCard.style.display = "none";
    txSummaryBody.innerHTML = "";
    confirmCard.style.display = "none";
    confirmBody.innerHTML = "";
  }

  return { showStepResult, setActiveStep, showBranch, clear };
}
