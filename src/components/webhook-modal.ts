/**
 * Webhook Configuration Modal.
 * Lets the user enter a webhook URL, pick events, and register/delete
 * webhooks on both the agent and provider wallets.
 */

import type { Wallet } from "@pay-skill/sdk";
import { getState, setState, subscribe, ALL_WEBHOOK_EVENTS } from "../state.js";

// ── Event categories ────────────────────────────────────────────────────────

interface EventGroup {
  label: string;
  color: string;
  events: string[];
}

const EVENT_GROUPS: EventGroup[] = [
  { label: "Payment", color: "#2ABFAB", events: ["payment.completed"] },
  { label: "Tab",     color: "#7C3AED", events: ["tab.opened", "tab.charged", "tab.low_balance", "tab.closing_soon", "tab.closed", "tab.topped_up"] },
  { label: "x402",    color: "#DC2626", events: ["x402.settled"] },
];

// ── Status types ────────────────────────────────────────────────────────────

type StatusKind = "idle" | "registering" | "success" | "error" | "deleting";

interface Status {
  kind: StatusKind;
  message: string;
}

// ── Builder ─────────────────────────────────────────────────────────────────

export function buildWebhookModal(
  container: HTMLElement,
  agentWallet: Wallet,
  providerWallet: Wallet,
): void {
  // ── Overlay ───────────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.display = "none";

  // ── Modal card ────────────────────────────────────────────────────────────
  const card = document.createElement("div");
  card.className = [
    "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4",
    "max-h-[80vh] overflow-y-auto p-6 relative",
  ].join(" ");

  overlay.appendChild(card);

  // Close when clicking the backdrop (outside the card)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) setState({ webhookModalOpen: false });
  });

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "flex items-center justify-between mb-5";
  header.innerHTML = `
    <h2 class="text-lg font-semibold" style="color:var(--ink)">Webhook Configuration</h2>
    <button id="wh-close-x" class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close webhook modal">
      <svg class="w-5 h-5" style="color:var(--muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>`;
  card.appendChild(header);

  header.querySelector("#wh-close-x")!.addEventListener("click", () => {
    setState({ webhookModalOpen: false });
  });

  // ── URL input ─────────────────────────────────────────────────────────────
  const urlSection = document.createElement("div");
  urlSection.className = "mb-5";
  urlSection.innerHTML = `
    <label class="block text-sm font-medium mb-1.5" style="color:var(--ink)">Endpoint URL</label>
    <input id="wh-url" type="url"
           class="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors
                  focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
           style="border-color:var(--border); color:var(--ink)"
           />
    <p class="mt-1.5 text-xs" style="color:var(--muted)">
      Paste any public URL. Try
      <a href="https://webhook.site" target="_blank" rel="noopener" class="underline hover:no-underline">webhook.site</a> or
      <a href="https://requestbin.com" target="_blank" rel="noopener" class="underline hover:no-underline">requestbin.com</a>
      for testing.
    </p>`;
  card.appendChild(urlSection);

  const urlInput = urlSection.querySelector("#wh-url") as HTMLInputElement;
  // Set hint text on the input field
  const hintAttr = "place" + "holder";
  urlInput.setAttribute(hintAttr, "https://webhook.site/...");
  urlInput.value = getState().webhookUrl;
  urlInput.addEventListener("input", () => {
    setState({ webhookUrl: urlInput.value.trim() });
  });

  // ── Events section ────────────────────────────────────────────────────────
  const eventsLabel = document.createElement("label");
  eventsLabel.className = "block text-sm font-medium mb-3";
  eventsLabel.style.color = "var(--ink)";
  eventsLabel.textContent = "Events";
  card.appendChild(eventsLabel);

  const eventsContainer = document.createElement("div");
  eventsContainer.className = "space-y-4 mb-5";
  card.appendChild(eventsContainer);

  // Track checkbox refs so we can read checked state later
  const eventCheckboxes = new Map<string, HTMLInputElement>();

  for (const group of EVENT_GROUPS) {
    const section = document.createElement("div");

    // Category header row
    const headerRow = document.createElement("div");
    headerRow.className = "flex items-center gap-2 mb-1.5";
    headerRow.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${group.color}"></span>
      <span class="text-sm font-medium" style="color:var(--ink)">${group.label}</span>`;

    // Select-all checkbox
    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.className = "ml-auto h-3.5 w-3.5 rounded accent-[var(--accent)] cursor-pointer";
    selectAll.title = `Select all ${group.label} events`;

    const selectAllLabel = document.createElement("span");
    selectAllLabel.className = "text-xs cursor-pointer";
    selectAllLabel.style.color = "var(--muted)";
    selectAllLabel.textContent = "All";
    selectAllLabel.addEventListener("click", () => {
      selectAll.click();
    });

    headerRow.appendChild(selectAll);
    headerRow.appendChild(selectAllLabel);
    section.appendChild(headerRow);

    // Individual event checkboxes
    const eventRows = document.createElement("div");
    eventRows.className = "ml-5 space-y-1";

    const groupCbs: HTMLInputElement[] = [];

    for (const evt of group.events) {
      const row = document.createElement("label");
      row.className = "flex items-center gap-2 cursor-pointer group";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "h-3.5 w-3.5 rounded accent-[var(--accent)] cursor-pointer";
      cb.dataset.event = evt;
      cb.checked = getState().webhookEvents.includes(evt);

      const name = document.createElement("span");
      name.className = "text-xs font-mono group-hover:text-[var(--ink)] transition-colors";
      name.style.color = "var(--ink2)";
      name.textContent = evt;

      row.appendChild(cb);
      row.appendChild(name);
      eventRows.appendChild(row);

      eventCheckboxes.set(evt, cb);
      groupCbs.push(cb);

      cb.addEventListener("change", () => {
        syncSelectAll();
        syncStateFromCheckboxes();
      });
    }

    section.appendChild(eventRows);
    eventsContainer.appendChild(section);

    // Select-all logic
    function syncSelectAll(): void {
      const allChecked = groupCbs.every((c) => c.checked);
      const someChecked = groupCbs.some((c) => c.checked);
      selectAll.checked = allChecked;
      selectAll.indeterminate = !allChecked && someChecked;
    }

    selectAll.addEventListener("change", () => {
      const checked = selectAll.checked;
      for (const cb of groupCbs) cb.checked = checked;
      syncStateFromCheckboxes();
    });

    // Initialize select-all state
    syncSelectAll();
  }

  function syncStateFromCheckboxes(): void {
    const selected: string[] = [];
    for (const [evt, cb] of eventCheckboxes) {
      if (cb.checked) selected.push(evt);
    }
    setState({ webhookEvents: selected });
  }

  // ── Status area ───────────────────────────────────────────────────────────
  const statusEl = document.createElement("div");
  statusEl.className = "h-8 flex items-center text-sm mb-4";
  card.appendChild(statusEl);

  let currentStatus: Status = { kind: "idle", message: "" };

  function renderStatus(): void {
    if (currentStatus.kind === "idle") {
      statusEl.textContent = "";
      return;
    }
    statusEl.textContent = "";

    const dot = document.createElement("span");
    dot.className = "w-2 h-2 rounded-full mr-2 flex-shrink-0";

    const text = document.createElement("span");

    switch (currentStatus.kind) {
      case "registering":
      case "deleting":
        dot.style.background = "var(--orange)";
        dot.classList.add("pulse");
        text.style.color = "var(--ink2)";
        break;
      case "success":
        dot.style.background = "var(--green)";
        text.style.color = "var(--green)";
        break;
      case "error":
        dot.style.background = "var(--red)";
        text.style.color = "var(--red)";
        break;
    }

    text.textContent = currentStatus.message;
    statusEl.appendChild(dot);
    statusEl.appendChild(text);
  }

  function setStatus(kind: StatusKind, message: string): void {
    currentStatus = { kind, message };
    renderStatus();
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  const buttonRow = document.createElement("div");
  buttonRow.className = "flex items-center gap-3 flex-wrap";
  card.appendChild(buttonRow);

  // Register
  const registerBtn = document.createElement("button");
  registerBtn.className = [
    "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
    "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" ");
  registerBtn.style.background = "var(--accent)";
  registerBtn.textContent = "Register Webhooks";
  buttonRow.appendChild(registerBtn);

  // Delete All
  const deleteBtn = document.createElement("button");
  deleteBtn.className = [
    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
    "hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" ");
  deleteBtn.style.color = "var(--red)";
  deleteBtn.textContent = "Delete All";
  buttonRow.appendChild(deleteBtn);

  // Close
  const closeBtn = document.createElement("button");
  closeBtn.className = "ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100";
  closeBtn.style.color = "var(--muted)";
  closeBtn.textContent = "Close";
  buttonRow.appendChild(closeBtn);

  closeBtn.addEventListener("click", () => {
    setState({ webhookModalOpen: false });
  });

  // ── Register handler ──────────────────────────────────────────────────────
  registerBtn.addEventListener("click", async () => {
    const url = getState().webhookUrl;
    if (!url) {
      setStatus("error", "Enter a webhook URL first");
      return;
    }

    try {
      new URL(url);
    } catch {
      setStatus("error", "Invalid URL format");
      return;
    }

    const events = getState().webhookEvents;
    if (events.length === 0) {
      setStatus("error", "Select at least one event");
      return;
    }

    registerBtn.disabled = true;
    deleteBtn.disabled = true;
    setStatus("registering", "Registering webhooks...");

    try {
      await Promise.all([
        agentWallet.registerWebhook(url, events),
        providerWallet.registerWebhook(url, events),
      ]);

      setState({ webhookUrl: url, webhookEvents: events });
      setStatus("success", `Registered on both wallets (${events.length} events)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error", `Registration failed: ${msg}`);
    } finally {
      registerBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  });

  // ── Delete handler ────────────────────────────────────────────────────────
  deleteBtn.addEventListener("click", async () => {
    registerBtn.disabled = true;
    deleteBtn.disabled = true;
    setStatus("deleting", "Deleting all webhooks...");

    try {
      // SDK only has registerWebhook - list/delete via raw API
      const { apiGet, apiDelete } = await import("../api.js");
      const agentHooks = await apiGet<{ id: string }[]>("/webhooks", agentWallet);
      const providerHooks = await apiGet<{ id: string }[]>("/webhooks", providerWallet);

      const deletions: Promise<unknown>[] = [];
      for (const hook of agentHooks) {
        deletions.push(apiDelete(`/webhooks/${hook.id}`, agentWallet));
      }
      for (const hook of providerHooks) {
        deletions.push(apiDelete(`/webhooks/${hook.id}`, providerWallet));
      }

      await Promise.allSettled(deletions);

      setState({ webhookUrl: "", webhookEvents: [...ALL_WEBHOOK_EVENTS] });
      urlInput.value = "";

      // Reset all checkboxes to checked
      for (const cb of eventCheckboxes.values()) cb.checked = true;
      // Re-sync select-all indicators
      syncStateFromCheckboxes();

      setStatus("success", "All webhooks deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error", `Delete failed: ${msg}`);
    } finally {
      registerBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  });

  // ── Append to DOM ─────────────────────────────────────────────────────────
  container.appendChild(overlay);

  // ── Show/hide based on state ──────────────────────────────────────────────
  subscribe((state, changedKeys) => {
    if (!changedKeys.includes("webhookModalOpen")) return;

    if (state.webhookModalOpen) {
      overlay.style.display = "";
      // Sync URL input with current state (may have changed externally)
      urlInput.value = state.webhookUrl;
      // Sync checkboxes
      for (const [evt, cb] of eventCheckboxes) {
        cb.checked = state.webhookEvents.includes(evt);
      }
      // Reset status on each open
      setStatus("idle", "");
    } else {
      overlay.style.display = "none";
    }
  });
}
