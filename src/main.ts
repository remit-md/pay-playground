// Playground entry point
// Flow demos (direct, tab, x402) will be implemented in separate tasks

type Flow = "direct" | "tab" | "x402";

function selectFlow(flow: Flow): void {
  const container = document.getElementById("flow-container");
  if (!container) return;
  container.textContent = `${flow} flow — not yet implemented`;
}

document.getElementById("btn-direct")?.addEventListener("click", () => selectFlow("direct"));
document.getElementById("btn-tab")?.addEventListener("click", () => selectFlow("tab"));
document.getElementById("btn-x402")?.addEventListener("click", () => selectFlow("x402"));
