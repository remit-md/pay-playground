/**
 * Wallet bar component for Playground V2.
 * Pixel-matches C4 mockup wallet bar (v2-mockups/C4-timeline-stripe.html).
 *
 * Structure:
 *   sticky top-14, bg-bg, border-b, h-11
 *   max-w-[1440px] container
 *   Left: Agent addr + balance + Manage | Provider addr + balance + Manage
 *   Right: block number (cosmetic)
 */

import type { Wallet } from "@pay-skill/sdk";
import { openFundPopup } from "../wallet.js";
import { isTestnet } from "../network.js";
import { getState, setState, subscribe } from "../state.js";

export function buildWalletBar(
  container: HTMLElement,
  agentWallet: Wallet,
  providerWallet: Wallet,
): void {
  container.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "sticky top-14 z-40 bg-bg border-b border-border";

  const inner = document.createElement("div");
  inner.className = "max-w-[1440px] mx-auto px-4 sm:px-6 h-11 flex items-center justify-between text-[13px]";

  // ── Left: wallets ──────────────────────────────────────────
  const left = document.createElement("div");
  left.className = "flex items-center gap-4";

  // Agent wallet
  const agentBalEl = buildWalletEntry("Agent", agentWallet, "agentBalance");
  left.appendChild(agentBalEl.el);

  // Provider wallet (hidden on small screens)
  const providerBalEl = buildWalletEntry("Provider", providerWallet, "providerBalance");
  providerBalEl.el.classList.add("hidden", "sm:flex");
  left.appendChild(providerBalEl.el);

  inner.appendChild(left);
  bar.appendChild(inner);
  container.appendChild(bar);

  // Kick off initial balance load
  refreshBalances(agentWallet, providerWallet);
}

function buildWalletEntry(
  role: string,
  wallet: Wallet,
  balanceKey: "agentBalance" | "providerBalance",
): { el: HTMLElement } {
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-2";

  // Role label
  const label = document.createElement("span");
  label.className = "text-ink2";
  label.textContent = role;
  wrap.appendChild(label);

  // Address (monospace, bordered code pill)
  const addr = document.createElement("code");
  addr.className = "font-mono text-[12px] bg-card border border-border rounded px-1.5 py-0.5";
  addr.textContent = truncateAddress(wallet.address);
  addr.title = wallet.address;
  wrap.appendChild(addr);

  // Balance
  const balEl = document.createElement("span");
  balEl.className = "font-mono font-semibold text-ink";
  balEl.textContent = formatBalance(getState()[balanceKey]);
  wrap.appendChild(balEl);

  // Manage button - prominent accent-colored
  const manageBtn = document.createElement("button");
  manageBtn.className = "text-[11px] bg-accent text-white font-semibold px-2.5 py-0.5 rounded-md hover:opacity-90 transition-opacity";
  manageBtn.textContent = "Manage Wallet";
  manageBtn.addEventListener("click", async () => {
    manageBtn.disabled = true;
    manageBtn.style.opacity = "0.5";
    try {
      await openFundPopup(wallet, isTestnet);
    } catch (err) {
      console.error(`[wallet-bar] Manage failed for ${role}:`, err);
    } finally {
      manageBtn.disabled = false;
      manageBtn.style.opacity = "1";
    }
  });
  wrap.appendChild(manageBtn);

  // Subscribe to balance updates
  subscribe((state, changed) => {
    if (changed.includes(balanceKey)) {
      balEl.textContent = formatBalance(state[balanceKey]);
    }
  });

  return { el: wrap };
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(amount: number | null): string {
  if (amount === null) return "? USDC";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

async function refreshBalances(
  agentWallet: Wallet,
  providerWallet: Wallet,
): Promise<void> {
  try {
    const [agentBal, providerBal] = await Promise.all([
      agentWallet.balance(),
      providerWallet.balance(),
    ]);
    setState({ agentBalance: agentBal, providerBalance: providerBal });
  } catch (err) {
    console.error("[wallet-bar] Failed to refresh balances:", err);
    setState({ agentBalance: null, providerBalance: null });
  }
}

