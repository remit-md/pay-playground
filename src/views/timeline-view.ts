/**
 * Timeline-cards view (C2) - alternating card layout with a central vertical spine.
 *
 * HTML structure pixel-matches the C2 mockup (v2-mockups/C2-timeline-cards.html).
 * All custom CSS classes are defined in styles.css.
 *
 * Layout:
 * - Agent steps branch LEFT of the spine
 * - Provider steps branch RIGHT
 * - System / webhook / decision steps are CENTERED on the spine
 * - Each step gets a colored dot on the spine + a connector arm to its card
 *
 * Mobile (<768px): spine moves to left:24px, all cards shift right (via CSS).
 */

import type { FlowSpec, FlowContext, StepResult, StepSpec, FlowState } from "../flows/types.js";
import type { SdkSample } from "../sdk-samples/types.js";
import { SDK_LANGUAGES } from "../sdk-samples/types.js";
import { setState, subscribe } from "../state.js";
import { highlightCode, highlightJson as hlJson } from "../highlight.js";

/* ── Public API ──────────────────────────────────────────────────── */

export interface TimelineViewApi {
  showStepResult(stepIndex: number, result: StepResult): void;
  setActiveStep(stepIndex: number): void;
  showBranch(stepIndex: number, onSelect: (branchId: string) => void): void;
  clear(): void;
}

export interface TimelineViewCallbacks {
  onRunStep?: (stepIndex: number) => void;
  onSkipStep?: (stepIndex: number) => void;
}

/* ── Dot color by role/variant ───────────────────────────────────── */

type DotColor = "teal" | "green" | "orange" | "indigo";

function dotColorClass(step: StepSpec): DotColor {
  if (step.variant === "webhook") return "orange";
  if (step.variant === "decision") return "teal"; // neutral
  if (step.role === "agent") return "teal";
  if (step.role === "provider") return "indigo";
  return "green"; // system
}

type Side = "left" | "right" | "center";

function stepSide(step: StepSpec): Side {
  if (step.variant === "webhook" || step.variant === "decision") return "center";
  if (step.role === "agent") return "left";
  if (step.role === "provider") return "right";
  return "center";
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function h(tag: string, className: string, innerHTML?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML !== undefined) el.innerHTML = innerHTML;
  return el;
}

/** Escape HTML entities in user-supplied data */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Format JSON with syntax highlighting */
function highlightJson(obj: unknown): string {
  return hlJson(obj);
}

/* ── External link SVG icon ──────────────────────────────────────── */

const EXTERNAL_LINK_SVG = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>';

/* ── State Diagram (inline, not collapsible - C2 style) ──────────── */

/** State color palette - cycles through accent, orange, green for variety. */
const STATE_COLORS = ["accent", "orange", "green", "indigo", "accent", "orange", "green"];

function stateColorAt(index: number): string {
  return STATE_COLORS[index % STATE_COLORS.length];
}

function renderStateDiagramC2(states: FlowState[], currentId?: string): HTMLElement {
  const wrap = h("div", "max-w-6xl mx-auto px-4 pt-6 pb-2");
  const row = h("div", "flex items-center justify-center gap-1 flex-wrap");

  const currentIdx = currentId ? states.findIndex((s) => s.id === currentId) : -1;

  for (let i = 0; i < states.length; i++) {
    if (i > 0) {
      row.appendChild(h("span", "state-arrow", "\u2192"));
    }
    const s = states[i];
    const color = stateColorAt(i);
    const isCurrent = i === currentIdx;

    const node = h("span", "state-node");
    if (isCurrent) {
      node.className = `state-node current bg-${color}/10 text-${color} border border-${color}/20`;
    } else if (currentIdx >= 0 && i < currentIdx) {
      // Completed states keep their color
      node.className = `state-node bg-${color}/10 text-${color} border border-${color}/20`;
    } else {
      node.className = "state-node bg-card text-ink2 border border-border";
    }

    const dotColor = `bg-${color}`;
    node.innerHTML = `<span class="w-2 h-2 rounded-full ${dotColor}"></span> ${esc(s.label)}`;
    node.setAttribute("data-state-id", s.id);
    row.appendChild(node);
  }

  wrap.appendChild(row);

  // Subtitle with current state label
  const sub = h("p", "text-center text-xs text-ink2 mt-2 font-sans");
  if (currentId && states.length > 0) {
    const currentState = states.find((s) => s.id === currentId);
    const color = currentIdx >= 0 ? stateColorAt(currentIdx) : "green";
    sub.innerHTML = `lifecycle &mdash; currently at <span class="font-mono text-${color}">${esc(currentState?.label ?? currentId)}</span>`;
  }
  wrap.appendChild(sub);

  return wrap;
}

function updateStateDiagramC2(container: HTMLElement, currentId: string): void {
  const nodes = container.querySelectorAll<HTMLElement>("[data-state-id]");
  const allStates = Array.from(nodes).map((n) => n.getAttribute("data-state-id") ?? "");
  const currentIdx = allStates.indexOf(currentId);

  nodes.forEach((node, i) => {
    const color = stateColorAt(i);
    if (i === currentIdx) {
      node.className = `state-node current bg-${color}/10 text-${color} border border-${color}/20`;
    } else if (currentIdx >= 0 && i < currentIdx) {
      node.className = `state-node bg-${color}/10 text-${color} border border-${color}/20`;
    } else {
      node.className = "state-node bg-card text-ink2 border border-border";
    }
  });

  // Update subtitle
  const sub = container.querySelector("p");
  if (sub && currentIdx >= 0) {
    const color = stateColorAt(currentIdx);
    const label = allStates[currentIdx];
    sub.innerHTML = `lifecycle &mdash; currently at <span class="font-mono text-${color}">${label}</span>`;
  }
}

/* ── Build SDK Tabs (C2 style - pill bg) ─────────────────────────── */

function buildSdkTabs(
  samples: SdkSample[],
): HTMLElement {
  const details = document.createElement("details");
  details.className = "mb-3";

  const summary = document.createElement("summary");
  summary.className = "text-xs font-sans text-ink2 font-semibold mb-2";
  summary.textContent = "SDK Code";
  details.appendChild(summary);

  const inner = h("div", "mt-2");

  // Tab row
  const tabRow = h("div", "flex gap-1 flex-wrap mb-2");
  const codeContainer = h("div", "");

  const languages = SDK_LANGUAGES;
  let activeIdx = 0;

  for (let i = 0; i < languages.length; i++) {
    const lang = languages[i];
    const tab = h("span", `sdk-tab-c2${i === 0 ? " active" : ""}`, esc(lang.displayName));
    tab.style.cursor = "pointer";
    tab.addEventListener("click", () => {
      // Update active tab
      tabRow.querySelectorAll(".sdk-tab-c2").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeIdx = i;
      renderCode();
    });
    tabRow.appendChild(tab);
  }

  function renderCode(): void {
    const lang = languages[activeIdx];
    const sample = samples.find((s) => s.lang === lang.lang);
    if (sample) {
      const highlighted = highlightCode(sample.code, lang.lang);
      codeContainer.innerHTML = `<div class="code-block">${highlighted}</div>`;
    } else {
      codeContainer.innerHTML = `<div class="code-block"><span class="cmt">// ${esc(lang.displayName)} sample coming soon</span></div>`;
    }
  }

  renderCode();
  inner.appendChild(tabRow);
  inner.appendChild(codeContainer);
  details.appendChild(inner);

  return details;
}

/* ── Build Request/Response JSON details ─────────────────────────── */

function buildJsonDetails(label: string, data: unknown | undefined): HTMLElement {
  const details = document.createElement("details");

  const summary = document.createElement("summary");
  summary.className = "text-xs font-sans text-ink2 font-semibold mb-2";
  summary.textContent = label;
  details.appendChild(summary);

  if (data !== undefined && data !== null) {
    const block = h("div", "code-block mt-2");
    block.innerHTML = highlightJson(data);
    details.appendChild(block);
  } else {
    const empty = h("div", "code-block mt-2");
    empty.innerHTML = '<span class="cmt">// Run the flow to see real data</span>';
    details.appendChild(empty);
  }

  return details;
}

/* ── Build a left/right step card (agent or provider) ────────────── */

function buildStepCard(
  step: StepSpec,
  stepIndex: number,
  side: "left" | "right",
  samples: SdkSample[],
  result: StepResult | null,
  stepCallbacks?: { onRunStep?: (i: number) => void; onSkipStep?: (i: number) => void },
  isFirstEnabled?: boolean,
): HTMLElement {
  const color = dotColorClass(step);
  const isLeft = side === "left";

  // Row container
  const row = h("div", "timeline-row relative flex items-start mb-12");

  // Dot on spine
  const dot = h("div", `timeline-dot ${color}`);
  dot.style.top = "28px";
  dot.setAttribute("data-step-dot", String(stepIndex));
  row.appendChild(dot);

  if (isLeft) {
    // LEFT card, RIGHT spacer
    const cardWrap = h("div", "card-left w-[calc(50%-2rem)] mr-auto pr-6");
    const card = h("div", "timeline-card bg-card border border-border rounded-xl p-5 shadow-sm relative");

    // Connector arm (right side of card → dot)
    const arm = h("div", "absolute top-7 right-0 w-6 h-0.5 bg-border");
    arm.style.right = "-24px";
    card.appendChild(arm);

    card.appendChild(buildCardContent(step, stepIndex, samples, result, stepCallbacks, isFirstEnabled));
    cardWrap.appendChild(card);
    row.appendChild(cardWrap);

    // Right spacer
    row.appendChild(h("div", "w-[calc(50%-2rem)]"));
  } else {
    // LEFT spacer, RIGHT card
    row.appendChild(h("div", "w-[calc(50%-2rem)]"));

    const cardWrap = h("div", "card-right w-[calc(50%-2rem)] ml-auto pl-6");
    const card = h("div", "timeline-card bg-card border border-border rounded-xl p-5 shadow-sm relative");

    // Connector arm (left side of card → dot)
    const arm = h("div", "absolute top-7 left-0 w-6 h-0.5 bg-border");
    arm.style.left = "-24px";
    card.appendChild(arm);

    card.appendChild(buildCardContent(step, stepIndex, samples, result, stepCallbacks, isFirstEnabled));
    cardWrap.appendChild(card);
    row.appendChild(cardWrap);
  }

  return row;
}

/* ── Card content (shared between left/right) ────────────────────── */

function buildCardContent(
  step: StepSpec,
  stepIndex: number,
  samples: SdkSample[],
  result: StepResult | null,
  stepCallbacks?: { onRunStep?: (i: number) => void; onSkipStep?: (i: number) => void },
  isFirstEnabled?: boolean,
): DocumentFragment {
  const frag = document.createDocumentFragment();
  const isOptional = step.optional === true;

  // Header: role dot + label + action buttons (top-right)
  const header = h("div", "flex items-start justify-between gap-2 mb-1");

  const left = h("div", "");
  const roleRow = h("div", "flex items-center gap-2");
  const roleDotColor = step.role === "agent" ? "bg-accent" : step.role === "provider" ? "bg-indigo" : "bg-green";
  roleRow.innerHTML = `<span class="w-2 h-2 rounded-full ${roleDotColor}"></span><span class="text-[10px] uppercase tracking-widest text-ink2 font-sans font-semibold">${esc(step.role)}</span>`;

  if (isOptional) {
    roleRow.innerHTML += `<span class="text-[9px] uppercase tracking-wider font-semibold text-ink2 bg-bg border border-border rounded-full px-1.5 py-0.5">Optional</span>`;
  }
  left.appendChild(roleRow);

  const title = h("h3", "font-mono font-bold text-base text-ink mt-1", esc(step.label));
  left.appendChild(title);
  header.appendChild(left);

  // Top-right: action buttons + source link
  const headerRight = h("div", "flex items-center gap-1.5 shrink-0");

  if (!result && stepCallbacks?.onRunStep) {
    const runBtn = document.createElement("button");
    runBtn.className = "flex items-center gap-1 bg-accent/10 text-accent border border-accent/20 text-[10px] font-semibold px-2 py-0.5 rounded-md hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
    runBtn.innerHTML = "&#9654; Run";
    runBtn.disabled = !isFirstEnabled;
    runBtn.addEventListener("click", () => stepCallbacks.onRunStep?.(stepIndex));
    headerRight.appendChild(runBtn);

    if (isOptional) {
      const skipBtn = document.createElement("button");
      skipBtn.className = "text-[10px] text-ink2 border border-border px-2 py-0.5 rounded-md hover:bg-border/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
      skipBtn.textContent = "Skip";
      skipBtn.disabled = !isFirstEnabled;
      skipBtn.addEventListener("click", () => stepCallbacks.onSkipStep?.(stepIndex));
      headerRight.appendChild(skipBtn);
    }
  } else if (result && !result.error) {
    const doneTag = h("span", "flex items-center gap-1 text-[10px] text-green font-semibold");
    doneTag.innerHTML = "&#10003; Done";
    headerRight.appendChild(doneTag);
  }

  if (step.sourceFile) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "view-source";
    sourceLink.href = `https://github.com/remit-md/remit-playground/blob/main/${step.sourceFile}`;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener";
    sourceLink.innerHTML = `${EXTERNAL_LINK_SVG} source`;
    headerRight.appendChild(sourceLink);
  }

  header.appendChild(headerRight);
  frag.appendChild(header);

  // Description
  const desc = h("p", "text-sm text-ink2 font-sans mb-1", esc(step.description));
  frag.appendChild(desc);

  // RFC 2119 annotation
  if (step.rfc2119) {
    const rfcEl = h("p", "text-[10px] font-mono text-ink2/70 mb-2");
    const keyword = step.rfc2119;
    const colorClass = keyword === "MUST" ? "text-accent" : keyword === "MAY" ? "text-green" : "text-orange";
    rfcEl.innerHTML = `<span class="${colorClass} font-bold">${esc(keyword)}</span> <span class="text-ink2/50">(RFC 2119)</span>`;
    if (isOptional) {
      rfcEl.innerHTML += ` &mdash; <span class="text-ink2/50">auto-handled if skipped</span>`;
    }
    frag.appendChild(rfcEl);
  } else {
    frag.appendChild(h("div", "mb-2"));
  }

  // Field-level RFC 2119 input annotations
  if (step.inputFields && step.inputFields.length > 0) {
    const fieldDetails = document.createElement("details");
    fieldDetails.className = "mb-2";
    const fieldSummary = document.createElement("summary");
    fieldSummary.className = "text-[10px] font-mono text-ink2/70 font-semibold cursor-pointer";
    fieldSummary.textContent = "Input Fields (RFC 2119)";
    fieldDetails.appendChild(fieldSummary);

    const fieldList = h("div", "mt-1 space-y-0.5 text-[10px] font-mono");
    for (const f of step.inputFields) {
      const isReq = f.keyword === "REQUIRED" || f.keyword === "MUST";
      const kwColor = isReq ? "text-accent" : "text-green";
      const fieldRow = h("div", "flex items-start gap-1.5 py-0.5");
      fieldRow.innerHTML = `<code class="text-ink font-bold shrink-0">${esc(f.field)}</code><span class="${kwColor} font-bold shrink-0">${esc(f.keyword)}</span><span class="text-ink2/60">${esc(f.note)}</span>`;
      fieldList.appendChild(fieldRow);
    }
    fieldDetails.appendChild(fieldList);
    frag.appendChild(fieldDetails);
  }

  // SDK code tabs
  frag.appendChild(buildSdkTabs(samples));

  // Request JSON
  const reqData = result?.request?.body ?? undefined;
  frag.appendChild(buildJsonDetails("Request JSON", reqData));

  // Response JSON (if result exists)
  if (result?.response !== undefined) {
    frag.appendChild(buildJsonDetails("Response JSON", result.response));
  }

  // Error display
  if (result?.error) {
    const errDiv = h("div", "mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700");
    errDiv.textContent = result.error.message;
    frag.appendChild(errDiv);
  }

  // Timing badge
  if (result?.timeMs !== undefined) {
    const badge = h("div", "mt-2 text-xs text-ink2 font-mono");
    badge.textContent = `${Math.round(result.timeMs)}ms`;
    frag.appendChild(badge);
  }

  return frag;
}

/* ── Build a center event (confirmation, system) ─────────────────── */

function buildCenterEvent(
  step: StepSpec,
  stepIndex: number,
  result: StepResult | null,
): HTMLElement {
  const row = h("div", "relative flex justify-center mb-12");

  // Use step's dot color - green for confirmations, teal for others
  const color = dotColorClass(step);
  const isConfirmation = color === "green";
  const dot = h("div", `timeline-dot ${color}`);
  dot.style.top = "12px";
  dot.setAttribute("data-step-dot", String(stepIndex));
  row.appendChild(dot);

  const borderClass = isConfirmation ? "border-green/30" : "border-border";
  const card = h("div", `center-event bg-card border ${borderClass} rounded-lg px-5 py-3 shadow-sm max-w-md text-center z-10 relative`);
  card.setAttribute("data-step-card", String(stepIndex));

  const icon = isConfirmation ? "&#10003;" : "&#9201;";
  const iconColor = isConfirmation ? "text-green" : "text-accent";
  const content = h("div", "flex items-center justify-center gap-2");
  content.innerHTML = `<span class="${iconColor} text-sm">${icon}</span><span class="font-sans text-sm font-semibold text-ink">${esc(step.label)}</span>`;
  card.appendChild(content);

  if (result?.response) {
    const txHash = extractTxHash(result.response);
    if (txHash) {
      const link = document.createElement("a");
      link.className = "tx-link mt-1 inline-block";
      link.href = "#";
      link.textContent = `${txHash.slice(0, 6)}...${txHash.slice(-4)} \u2197`;
      card.appendChild(link);
    }
  }

  const timing = h("p", "text-xs text-ink2 mt-1 font-sans");
  if (result?.timeMs) {
    timing.textContent = `Confirmed in ${(result.timeMs / 1000).toFixed(1)}s`;
  } else {
    timing.textContent = esc(step.description);
  }
  card.appendChild(timing);

  row.appendChild(card);
  return row;
}

/* ── Build a webhook event card (dashed orange) ──────────────────── */

function buildWebhookEvent(
  step: StepSpec,
  stepIndex: number,
  result: StepResult | null,
): HTMLElement {
  const row = h("div", "relative flex justify-center mb-12");

  const dot = h("div", "timeline-dot orange");
  dot.style.top = "12px";
  dot.setAttribute("data-step-dot", String(stepIndex));
  row.appendChild(dot);

  const card = h("div", "center-event webhook-card rounded-lg px-5 py-3 max-w-md text-center z-10 relative");
  card.setAttribute("data-step-card", String(stepIndex));

  const content = h("div", "flex items-center justify-center gap-2");
  content.innerHTML = `<span class="text-orange text-sm">&#128236;</span><span class="font-mono text-sm font-bold text-orange">${esc(step.label)}</span>`;
  card.appendChild(content);

  const timing = h("p", "text-xs text-ink2 mt-1 font-sans");
  if (result?.timeMs) {
    timing.textContent = `Webhook delivered in ${Math.round(result.timeMs)}ms`;
  } else {
    timing.textContent = esc(step.description);
  }
  card.appendChild(timing);

  // Configure webhook shortcut
  const configBtn = document.createElement("button");
  configBtn.className = "text-[11px] text-orange hover:text-accent transition-colors mt-1 font-sans";
  configBtn.textContent = "Configure \u2192";
  configBtn.addEventListener("click", () => setState({ webhookModalOpen: true }));
  card.appendChild(configBtn);

  // Collapsible payload
  if (result?.response) {
    const details = document.createElement("details");
    details.className = "mt-2 text-left";
    const summary = document.createElement("summary");
    summary.className = "text-xs font-sans text-ink2 font-semibold";
    summary.textContent = "Payload";
    details.appendChild(summary);

    const block = h("div", "code-block mt-2 text-left");
    block.style.fontSize = "11px";
    block.innerHTML = highlightJson(result.response);
    details.appendChild(block);
    card.appendChild(details);
  }

  row.appendChild(card);
  return row;
}

/* ── Build a decision fork ───────────────────────────────────────── */

function buildDecision(
  step: StepSpec,
  stepIndex: number,
  onBranch?: (branchId: string) => void,
): HTMLElement {
  const frag = document.createDocumentFragment();

  // Decision pill
  const row = h("div", "relative flex justify-center mb-4");
  const dot = h("div", "timeline-dot");
  dot.style.top = "8px";
  dot.style.background = "#E8E8E4";
  dot.style.boxShadow = "0 0 0 2px #E8E8E440";
  dot.setAttribute("data-step-dot", String(stepIndex));
  row.appendChild(dot);

  const center = h("div", "center-event z-10 relative");
  center.setAttribute("data-step-card", String(stepIndex));

  if (step.branches && onBranch) {
    // Show decision buttons
    const btnRow = h("div", "flex gap-2 justify-center");
    for (const branch of step.branches) {
      const btn = document.createElement("button");
      const isPrimary = branch.style === "primary";
      btn.className = isPrimary
        ? "flex items-center gap-1.5 bg-green/10 text-green border border-green/20 text-[13px] font-semibold px-4 py-1.5 rounded-lg"
        : "flex items-center gap-1.5 bg-ink2/5 text-ink2 border border-border text-[13px] font-semibold px-4 py-1.5 rounded-lg";
      btn.innerHTML = `${branch.icon ? `<span>${esc(branch.icon)}</span>` : ""} ${esc(branch.label)}`;
      btn.addEventListener("click", () => onBranch(branch.id));
      btnRow.appendChild(btn);
    }
    center.appendChild(btnRow);
  } else {
    // Show decision label
    const label = h("p", "text-xs text-ink2 font-sans text-center bg-bg px-3 py-1 rounded-full border border-border");
    const branchLabels = step.branches?.map((b) => b.label).join(" or ") ?? "...";
    label.innerHTML = `&#9656; Decision &mdash; ${esc(branchLabels)}`;
    center.appendChild(label);
  }

  row.appendChild(center);
  frag.appendChild(row);

  // Fork visual: two diagonal lines
  const fork = h("div", "relative h-10 mb-4");
  const leftLine = h("div", "absolute left-1/2 top-0 w-px origin-top-left");
  leftLine.style.height = "50px";
  leftLine.style.background = "#E8E8E4";
  leftLine.style.transform = "translateX(-50%) rotate(25deg)";
  fork.appendChild(leftLine);

  const rightLine = h("div", "absolute left-1/2 top-0 w-px origin-top-right");
  rightLine.style.height = "50px";
  rightLine.style.background = "#E8E8E4";
  rightLine.style.transform = "translateX(-50%) rotate(-25deg)";
  fork.appendChild(rightLine);

  frag.appendChild(fork);

  // Return as wrapper div (DocumentFragment can't be returned as HTMLElement)
  const wrapper = h("div", "");
  wrapper.appendChild(frag);
  return wrapper;
}

/* ── Extract txHash from response object ─────────────────────────── */

function extractTxHash(response: unknown): string | null {
  if (typeof response === "object" && response !== null) {
    const r = response as Record<string, unknown>;
    if (typeof r.txHash === "string") return r.txHash;
    if (typeof r.tx_hash === "string") return r.tx_hash;
  }
  return null;
}

/* ── Build the full timeline view ────────────────────────────────── */

export function buildTimelineView(
  container: HTMLElement,
  flow: FlowSpec,
  ctx: FlowContext,
  getSamples: (flowId: string, stepId: string) => SdkSample[],
  callbacks?: TimelineViewCallbacks,
): TimelineViewApi {

  // Track step elements for updates
  interface StepEntry {
    row: HTMLElement;
    dot: HTMLElement;
    step: StepSpec;
    result: StepResult | null;
    branchCallback: ((branchId: string) => void) | null;
  }

  const entries: StepEntry[] = [];
  let unsubscribe: (() => void) | null = null;

  // ── Clear container ──────────────────────────────────────────
  container.innerHTML = "";

  // ── State Diagram ────────────────────────────────────────────
  const initialStateId = flow.states.length > 0 ? flow.states[0].id : undefined;
  const diagramEl = renderStateDiagramC2(flow.states, initialStateId);
  container.appendChild(diagramEl);

  // ── Timeline Main Area ───────────────────────────────────────
  const main = h("main", "max-w-6xl mx-auto px-4 py-8");
  const timelineContainer = h("div", "relative");

  // Central spine
  timelineContainer.appendChild(h("div", "timeline-spine"));

  const stepCallbacks = callbacks ? { onRunStep: callbacks.onRunStep, onSkipStep: callbacks.onSkipStep } : undefined;

  // ── Build entries for each step ──────────────────────────────
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const side = stepSide(step);
    const samples = getSamples(flow.id, step.id);
    const isFirstEnabled = i === 0;

    let rowEl: HTMLElement;

    if (step.variant === "decision") {
      rowEl = buildDecision(step, i);
    } else if (step.variant === "webhook") {
      rowEl = buildWebhookEvent(step, i, null);
    } else if (side === "center") {
      rowEl = buildCenterEvent(step, i, null);
    } else {
      rowEl = buildStepCard(step, i, side, samples, null, stepCallbacks, isFirstEnabled);
    }

    timelineContainer.appendChild(rowEl);

    // Find the dot element inside this row
    const dotEl = rowEl.querySelector<HTMLElement>(`[data-step-dot="${i}"]`) ?? rowEl;

    entries.push({
      row: rowEl,
      dot: dotEl,
      step,
      result: null,
      branchCallback: null,
    });
  }

  // ── Timeline end cap ─────────────────────────────────────────
  const endCap = h("div", "relative flex justify-center");
  const endDot = h("div", "w-3 h-3 rounded-full bg-border relative z-10");
  endDot.style.marginTop = "2px";
  endCap.appendChild(endDot);
  timelineContainer.appendChild(endCap);

  main.appendChild(timelineContainer);
  container.appendChild(main);

  // ── State subscription ───────────────────────────────────────
  unsubscribe = subscribe((state, changed) => {
    if (changed.includes("activeStepIndex") && flow.states.length > 0) {
      const idx = Math.min(Math.max(state.activeStepIndex, 0), flow.states.length - 1);
      updateStateDiagramC2(diagramEl, flow.states[idx].id);
    }
  });

  // ── Rebuild a single step's row ──────────────────────────────
  function rebuildStep(index: number): void {
    const entry = entries[index];
    if (!entry) return;

    const { step, result, branchCallback } = entry;
    const side = stepSide(step);
    const samples = getSamples(flow.id, step.id);

    // Check if previous step is completed (to enable this step's button)
    const prevCompleted = index === 0 || entries[index - 1]?.result != null;

    let newRow: HTMLElement;

    if (step.variant === "decision") {
      newRow = buildDecision(step, index, branchCallback ?? undefined);
    } else if (step.variant === "webhook") {
      newRow = buildWebhookEvent(step, index, result);
    } else if (side === "center") {
      newRow = buildCenterEvent(step, index, result);
    } else {
      newRow = buildStepCard(step, index, side, samples, result, stepCallbacks, prevCompleted);
    }

    // Replace in DOM
    entry.row.replaceWith(newRow);
    entry.row = newRow;
    entry.dot = newRow.querySelector<HTMLElement>(`[data-step-dot="${index}"]`) ?? newRow;
  }

  // ── API ──────────────────────────────────────────────────────

  function showStepResult(stepIndex: number, result: StepResult): void {
    const entry = entries[stepIndex];
    if (!entry) return;
    entry.result = result;
    rebuildStep(stepIndex);

    // Enable the next step's button by rebuilding it
    for (let next = stepIndex + 1; next < entries.length; next++) {
      const nextEntry = entries[next];
      if (nextEntry && nextEntry.step.variant !== "webhook" && nextEntry.step.variant !== "decision") {
        rebuildStep(next);
        break;
      }
    }

    // Scroll into view
    entry.row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setActiveStep(stepIndex: number): void {
    // Pulse active dot, remove from others
    for (const entry of entries) {
      entry.dot.classList.remove("pulse");
    }
    const entry = entries[stepIndex];
    if (entry) {
      entry.dot.classList.add("pulse");
      entry.row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Update state diagram
    if (flow.states.length > 0) {
      const stateIdx = Math.min(stepIndex, flow.states.length - 1);
      updateStateDiagramC2(diagramEl, flow.states[stateIdx].id);
    }
  }

  function showBranch(
    stepIndex: number,
    onSelect: (branchId: string) => void,
  ): void {
    const entry = entries[stepIndex];
    if (!entry) return;
    entry.branchCallback = onSelect;
    rebuildStep(stepIndex);
    entry.row.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clear(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    container.innerHTML = "";
    entries.length = 0;
  }

  return { showStepResult, setActiveStep, showBranch, clear };
}
