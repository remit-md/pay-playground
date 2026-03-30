/**
 * Collapsible bottom bar showing HTTP request history.
 * Reads from the shared `networkLog` array in api.ts.
 */

import { networkLog, clearNetworkLog } from "../api.js";

export interface NetworkLogHandle {
  /** Re-read networkLog and rebuild rows. */
  refresh: () => void;
  /** Clear networkLog and wipe the table. */
  clear: () => void;
}

/**
 * Build the network log panel inside `container`.
 * Returns a handle with refresh() and clear() methods.
 */
export function buildNetworkLog(container: HTMLElement): NetworkLogHandle {
  container.innerHTML = "";

  // ── outer wrapper ──────────────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.className =
    "network-footer sticky bottom-0 w-full z-40 transition-all duration-200";
  container.appendChild(wrapper);

  // ── header bar (always visible, 32px) ──────────────────────────
  const header = document.createElement("div");
  header.className =
    "flex items-center justify-between px-3 h-8 cursor-pointer select-none";
  wrapper.appendChild(header);

  const leftGroup = document.createElement("div");
  leftGroup.className = "flex items-center gap-2";

  const label = document.createElement("span");
  label.className = "text-xs font-semibold text-[#1A1A1A]";
  label.textContent = "Network Log";

  const badge = document.createElement("span");
  badge.className = "text-[10px] text-[#8E8E93]";
  badge.textContent = "(0 requests)";

  const toggle = document.createElement("span");
  toggle.className = "text-xs text-[#8E8E93] transition-transform duration-150";
  toggle.textContent = "\u25B8"; // ▸

  leftGroup.append(label, badge, toggle);

  const clearBtn = document.createElement("button");
  clearBtn.className =
    "text-[10px] text-[#8E8E93] hover:text-[#717171] transition-colors px-1";
  clearBtn.textContent = "Clear";

  header.append(leftGroup, clearBtn);

  // ── expandable body ────────────────────────────────────────────
  const body = document.createElement("div");
  body.className = "max-h-48 overflow-y-auto hidden";
  wrapper.appendChild(body);

  const table = document.createElement("table");
  table.className = "w-full text-xs";
  body.appendChild(table);

  // Header row
  const thead = document.createElement("thead");
  thead.innerHTML =
    '<tr class="text-left text-[#8E8E93] border-b border-[#E8E8E4]">' +
    '<th class="px-3 py-1 font-medium w-16">Method</th>' +
    '<th class="px-3 py-1 font-medium">Path</th>' +
    '<th class="px-3 py-1 font-medium w-16">Status</th>' +
    '<th class="px-3 py-1 font-medium w-16 text-right">Size</th>' +
    '<th class="px-3 py-1 font-medium w-16 text-right">Time</th>' +
    '<th class="px-1 py-1 w-6"></th>' +
    "</tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // ── state ──────────────────────────────────────────────────────
  let expanded = false;

  function setExpanded(open: boolean): void {
    expanded = open;
    body.classList.toggle("hidden", !expanded);
    toggle.textContent = expanded ? "\u25BE" : "\u25B8"; // ▾ / ▸
  }

  header.addEventListener("click", () => setExpanded(!expanded));

  // ── refresh ────────────────────────────────────────────────────
  function refresh(): void {
    const count = networkLog.length;
    badge.textContent = `(${count} request${count === 1 ? "" : "s"})`;

    tbody.innerHTML = "";

    // Show newest first
    for (let i = count - 1; i >= 0; i--) {
      const entry = networkLog[i];
      const tr = document.createElement("tr");
      tr.className = "border-b border-[#E8E8E4] hover:bg-[#FAFAF7] group";

      // Method (colored text, not bg pill - matches mockup)
      const tdMethod = document.createElement("td");
      tdMethod.className = `px-3 py-1 font-mono font-semibold ${methodColor(entry.method)}`;
      tdMethod.textContent = entry.method;

      // Path
      const tdPath = document.createElement("td");
      tdPath.className = "px-3 py-1 font-mono text-[#1A1A1A] truncate max-w-[200px]";
      tdPath.textContent = entry.path;
      tdPath.title = entry.path;

      // Status
      const tdStatus = document.createElement("td");
      tdStatus.className = `px-3 py-1 font-mono ${statusColor(entry.status)}`;
      tdStatus.textContent = String(entry.status);

      // Size
      const tdSize = document.createElement("td");
      tdSize.className = "px-3 py-1 font-mono text-[#8E8E93] text-right";
      tdSize.textContent = formatSize(entry.size);

      // Time
      const tdTime = document.createElement("td");
      tdTime.className = "px-3 py-1 font-mono text-[#8E8E93] text-right";
      tdTime.textContent = `${entry.timeMs}ms`;

      // Expand toggle for details
      const tdExpand = document.createElement("td");
      tdExpand.className = "px-1 py-1 text-center";
      const expandBtn = document.createElement("button");
      expandBtn.className =
        "text-[#8E8E93] hover:text-[#717171] opacity-0 group-hover:opacity-100 transition-opacity text-[10px]";
      expandBtn.textContent = "\u25B8"; // ▸
      expandBtn.title = "Show details";
      tdExpand.appendChild(expandBtn);

      tr.append(tdMethod, tdPath, tdStatus, tdSize, tdTime, tdExpand);

      // Detail row (hidden by default)
      const detailRow = document.createElement("tr");
      detailRow.className = "hidden";
      const detailCell = document.createElement("td");
      detailCell.colSpan = 6;
      detailCell.className = "px-3 py-2 bg-[#FAFAF7] text-[10px] text-[#717171] font-mono";
      detailCell.textContent = `${entry.method} ${entry.path} \u2014 ${entry.status} (${entry.timeMs}ms)`;
      detailRow.appendChild(detailCell);

      let detailOpen = false;
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        detailOpen = !detailOpen;
        detailRow.classList.toggle("hidden", !detailOpen);
        expandBtn.textContent = detailOpen ? "\u25BE" : "\u25B8";
      });

      tbody.append(tr, detailRow);
    }
  }

  // ── clear ──────────────────────────────────────────────────────
  function clear(): void {
    clearNetworkLog();
    refresh();
  }

  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clear();
  });

  // Initial render
  refresh();

  return { refresh, clear };
}

// ── helpers ──────────────────────────────────────────────────────

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-[#2ABFAB]";
    case "POST":
      return "text-[#2ABFAB]";
    case "PATCH":
    case "PUT":
      return "text-[#FF9500]";
    case "DELETE":
      return "text-[#FF3B30]";
    default:
      return "text-[#8E8E93]";
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "text-[#34C759]";
  if (status >= 400 && status < 500) return "text-[#FF9500]";
  if (status >= 500) return "text-[#FF3B30]";
  return "text-[#8E8E93]";
}
