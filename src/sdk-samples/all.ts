/**
 * SDK code samples for all 9 languages × all flow steps.
 * Auto-registers via registerSample() on import.
 *
 * Method names follow SUPPLEMENTAL D10 (exact per-language SDK matrix).
 * Snippets show real SDK calls - no fabrication.
 */

import { registerSample } from "./index.js";
import type { SdkLanguage } from "./types.js";
import { SDK_LANGUAGES } from "./types.js";

// ── Helper ─────────────────────────────────────────────────

function reg(flowId: string, stepId: string, snippets: Partial<Record<SdkLanguage, string>>): void {
  for (const meta of SDK_LANGUAGES) {
    const code = snippets[meta.lang];
    if (code) {
      registerSample(flowId, stepId, {
        lang: meta.lang,
        displayName: meta.displayName,
        installCmd: meta.installCmd,
        code: code.trim(),
      });
    }
  }
}

// ════════════════════════════════════════════════════════════
// DIRECT PAYMENT
// ════════════════════════════════════════════════════════════

reg("direct", "get-contracts", {
  typescript: `const contracts = await wallet.getContracts();
// contracts.router, contracts.usdc, contracts.escrow, ...`,
  python: `contracts = await wallet.get_contracts()
# contracts.router, contracts.usdc, contracts.escrow, ...`,
  go: `contracts, err := client.GetContracts(ctx)`,
  rust: `let contracts = client.get_contracts().await?;`,
  ruby: `contracts = wallet.get_contracts`,
  csharp: `var contracts = await wallet.GetContractsAsync();`,
  java: `var contracts = wallet.getContracts();`,
  swift: `let contracts = try await wallet.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(wallet)`,
});

reg("direct", "sign-permit", {
  typescript: `const permit = await agent.signPermit("direct", 5.00);`,
  python: `permit = await agent.sign_permit("direct", 5.00)`,
  go: `permit, err := agent.SignPermit(ctx, "direct", 5.00)`,
  rust: `let permit = agent.sign_permit("direct", 5.00).await?;`,
  ruby: `permit = agent.sign_permit("direct", 5.00)`,
  csharp: `var permit = await agent.SignPermitAsync("direct", 5.00m);`,
  java: `var permit = agent.signPermit("direct", 5.00);`,
  swift: `let permit = try await agent.signPermit(flow: "direct", amount: 5.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "direct", 5.00)`,
});

reg("direct", "pay-direct", {
  typescript: `const result = await agent.payDirect(
  provider.address,
  5.00,
  "direct-payment:playground",
  { permit }
);
// result.invoiceId, result.txHash`,
  python: `result = await agent.pay_direct(
    to=provider.address,
    amount=5.00,
    memo="direct-payment:playground",
    permit=permit,
)`,
  go: `result, err := agent.Pay(ctx, payskill.PayParams{
    To:     provider.Address,
    Amount: 5.00,
    Memo:   "direct-payment:playground",
}, payskill.WithPermit(permit))`,
  rust: `let result = agent.pay(PayParams {
    to: provider.address(),
    amount: 5.00,
    memo: "direct-payment:playground".into(),
}, Some(permit)).await?;`,
  ruby: `result = agent.pay(
  to: provider.address,
  amount: 5.00,
  memo: "direct-payment:playground",
  permit: permit,
)`,
  csharp: `var result = await agent.PayAsync(
    provider.Address, 5.00m, "direct-payment:playground",
    new PayOptions { Permit = permit });`,
  java: `var result = agent.pay(
    provider.address(), 5.00, "direct-payment:playground",
    PayOptions.withPermit(permit));`,
  swift: `let result = try await agent.pay(
    to: provider.address, amount: 5.00,
    memo: "direct-payment:playground", permit: permit)`,
  elixir: `{:ok, result} = Remitmd.pay(agent,
  to: provider.address, amount: 5.00,
  memo: "direct-payment:playground", permit: permit)`,
});

// Webhook steps - show payload handling (registration is one-time setup)
reg("direct", "webhook-sent", {
  typescript: `// Handle incoming payment.sent webhook
app.post("/webhooks", (req, res) => {
  const { event, data } = req.body;
  if (event === "payment.sent") {
    console.log(\`Sent \${data.amount} USDC → \${data.to}\`);
  }
  res.sendStatus(200);
});`,
  python: `# Handle incoming payment.sent webhook
@app.post("/webhooks")
async def handle_webhook(request):
    body = await request.json()
    if body["event"] == "payment.sent":
        print(f"Sent {body['data']['amount']} USDC")
    return {"ok": True}`,
  go: `// Handle incoming payment.sent webhook
http.HandleFunc("/webhooks", func(w http.ResponseWriter, r *http.Request) {
    var ev payskill.WebhookEvent
    json.NewDecoder(r.Body).Decode(&ev)
    if ev.Event == "payment.sent" {
        log.Printf("Sent %s USDC", ev.Data.Amount)
    }
    w.WriteHeader(200)
})`,
  rust: `// Handle incoming payment.sent webhook
async fn handle_webhook(Json(ev): Json<WebhookEvent>) -> StatusCode {
    if ev.event == "payment.sent" {
        println!("Sent {} USDC", ev.data.amount);
    }
    StatusCode::OK
}`,
  ruby: `# Handle incoming payment.sent webhook
post "/webhooks" do
  ev = JSON.parse(request.body.read)
  if ev["event"] == "payment.sent"
    puts "Sent #{ev['data']['amount']} USDC"
  end
  status 200
end`,
  csharp: `// Handle incoming payment.sent webhook
app.MapPost("/webhooks", (WebhookEvent ev) => {
    if (ev.Event == "payment.sent")
        Console.WriteLine($"Sent {ev.Data.Amount} USDC");
    return Results.Ok();
});`,
  java: `// Handle incoming payment.sent webhook
@PostMapping("/webhooks")
ResponseEntity<Void> handleWebhook(@RequestBody WebhookEvent ev) {
    if ("payment.sent".equals(ev.getEvent()))
        log.info("Sent {} USDC", ev.getData().getAmount());
    return ResponseEntity.ok().build();
}`,
  swift: `// Handle incoming payment.sent webhook
app.post("webhooks") { req -> HTTPStatus in
    let ev = try req.content.decode(WebhookEvent.self)
    if ev.event == "payment.sent" {
        print("Sent \\(ev.data.amount) USDC")
    }
    return .ok
}`,
  elixir: `# Handle incoming payment.sent webhook
post "/webhooks" do
  {:ok, body, conn} = Plug.Conn.read_body(conn)
  ev = Jason.decode!(body)
  if ev["event"] == "payment.sent" do
    IO.puts("Sent #{ev["data"]["amount"]} USDC")
  end
  send_resp(conn, 200, "ok")
end`,
});

reg("direct", "webhook-received", {
  typescript: `// Handle incoming payment.received webhook
app.post("/webhooks", (req, res) => {
  const { event, data } = req.body;
  if (event === "payment.received") {
    console.log(\`Received \${data.amount} USDC from \${data.from}\`);
  }
  res.sendStatus(200);
});`,
  python: `# Handle incoming payment.received webhook
@app.post("/webhooks")
async def handle_webhook(request):
    body = await request.json()
    if body["event"] == "payment.received":
        print(f"Received {body['data']['amount']} USDC")
    return {"ok": True}`,
  go: `// Handle incoming payment.received webhook
http.HandleFunc("/webhooks", func(w http.ResponseWriter, r *http.Request) {
    var ev payskill.WebhookEvent
    json.NewDecoder(r.Body).Decode(&ev)
    if ev.Event == "payment.received" {
        log.Printf("Received %s USDC", ev.Data.Amount)
    }
    w.WriteHeader(200)
})`,
  rust: `// Handle incoming payment.received webhook
async fn handle_webhook(Json(ev): Json<WebhookEvent>) -> StatusCode {
    if ev.event == "payment.received" {
        println!("Received {} USDC", ev.data.amount);
    }
    StatusCode::OK
}`,
  ruby: `# Handle incoming payment.received webhook
post "/webhooks" do
  ev = JSON.parse(request.body.read)
  if ev["event"] == "payment.received"
    puts "Received #{ev['data']['amount']} USDC"
  end
  status 200
end`,
  csharp: `// Handle incoming payment.received webhook
app.MapPost("/webhooks", (WebhookEvent ev) => {
    if (ev.Event == "payment.received")
        Console.WriteLine($"Received {ev.Data.Amount} USDC");
    return Results.Ok();
});`,
  java: `// Handle incoming payment.received webhook
@PostMapping("/webhooks")
ResponseEntity<Void> handleWebhook(@RequestBody WebhookEvent ev) {
    if ("payment.received".equals(ev.getEvent()))
        log.info("Received {} USDC", ev.getData().getAmount());
    return ResponseEntity.ok().build();
}`,
  swift: `// Handle incoming payment.received webhook
app.post("webhooks") { req -> HTTPStatus in
    let ev = try req.content.decode(WebhookEvent.self)
    if ev.event == "payment.received" {
        print("Received \\(ev.data.amount) USDC")
    }
    return .ok
}`,
  elixir: `# Handle incoming payment.received webhook
post "/webhooks" do
  {:ok, body, conn} = Plug.Conn.read_body(conn)
  ev = Jason.decode!(body)
  if ev["event"] == "payment.received" do
    IO.puts("Received #{ev["data"]["amount"]} USDC")
  end
  send_resp(conn, 200, "ok")
end`,
});

// ════════════════════════════════════════════════════════════
// ESCROW
// ════════════════════════════════════════════════════════════

reg("escrow", "get-contracts", {
  typescript: `const contracts = await agent.getContracts();`,
  python: `contracts = await agent.get_contracts()`,
  go: `contracts, err := agent.GetContracts(ctx)`,
  rust: `let contracts = agent.get_contracts().await?;`,
  ruby: `contracts = agent.get_contracts`,
  csharp: `var contracts = await agent.GetContractsAsync();`,
  java: `var contracts = agent.getContracts();`,
  swift: `let contracts = try await agent.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(agent)`,
});

reg("escrow", "sign-permit", {
  typescript: `const permit = await agent.signPermit("escrow", 10.00);`,
  python: `permit = await agent.sign_permit("escrow", 10.00)`,
  go: `permit, err := agent.SignPermit(ctx, "escrow", 10.00)`,
  rust: `let permit = agent.sign_permit("escrow", 10.00).await?;`,
  ruby: `permit = agent.sign_permit("escrow", 10.00)`,
  csharp: `var permit = await agent.SignPermitAsync("escrow", 10.00m);`,
  java: `var permit = agent.signPermit("escrow", 10.00);`,
  swift: `let permit = try await agent.signPermit(flow: "escrow", amount: 10.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "escrow", 10.00)`,
});

reg("escrow", "fund-escrow", {
  typescript: `const escrow = await agent.pay(
  { to: provider.address, amount: 10.00, memo: "escrow-fund:playground" },
  { permit },
);
// escrow.invoiceId - use this to release/cancel`,
  python: `from payskill.models.invoice import Invoice

invoice = Invoice(to=provider.address, amount=10.00, memo="escrow-fund:playground")
escrow = await agent.pay(invoice, permit=permit)`,
  go: `escrow, err := agent.CreateEscrow(ctx, provider.Address(),
    decimal.NewFromFloat(10.00),
    payskill.WithEscrowMemo("escrow-fund:playground"),
    payskill.WithEscrowPermit(permit))`,
  rust: `let escrow = agent.create_escrow(
    provider.address(), dec!(10.00),
).await?;
// escrow.invoice_id - use to release/cancel`,
  ruby: `escrow = agent.create_escrow(
  provider.address, 10.00,
  memo: "escrow-fund:playground", permit: permit)`,
  csharp: `var escrow = await agent.CreateEscrowAsync(
    provider.Address, 10.00m, "escrow-fund:playground",
    permit: permit);`,
  java: `var escrow = agent.createEscrow(
    provider.address(), BigDecimal.valueOf(10.00), permit);`,
  swift: `let escrow = try await agent.createEscrow(
    recipient: provider.address, amount: 10.00,
    conditions: "escrow-fund:playground", permit: permit)`,
  elixir: `{:ok, escrow} = Remitmd.create_escrow(agent,
  provider.address, 10.00,
  description: "escrow-fund:playground")`,
});

reg("escrow", "claim-start", {
  typescript: `const claim = await provider.claimStart(escrow.invoiceId);`,
  python: `claim = await provider.claim_start(escrow.invoice_id)`,
  go: `claim, err := provider.ClaimStart(ctx, escrow.InvoiceID)`,
  rust: `let claim = provider.claim_start(&escrow.invoice_id).await?;`,
  ruby: `claim = provider.claim_start(escrow.invoice_id)`,
  csharp: `var claim = await provider.ClaimStartAsync(escrow.InvoiceId);`,
  java: `var claim = provider.claimStart(escrow.invoiceId());`,
  swift: `let claim = try await provider.claimStart(escrow.invoiceId)`,
  elixir: `{:ok, claim} = Remitmd.claim_start(provider, escrow.invoice_id)`,
});

reg("escrow", "release-escrow", {
  typescript: `const release = await agent.releaseEscrow(escrow.invoiceId);
// Funds sent to provider, minus protocol fee`,
  python: `release = await agent.release_escrow(escrow.invoice_id)`,
  go: `release, err := agent.ReleaseEscrow(ctx, escrow.InvoiceID)`,
  rust: `let release = agent.release_escrow(&escrow.invoice_id).await?;`,
  ruby: `release = agent.release_escrow(escrow.invoice_id)`,
  csharp: `var release = await agent.ReleaseEscrowAsync(escrow.InvoiceId);`,
  java: `var release = agent.releaseEscrow(escrow.invoiceId());`,
  swift: `let release = try await agent.releaseEscrow(escrow.invoiceId)`,
  elixir: `{:ok, release} = Remitmd.release_escrow(agent, escrow.invoice_id)`,
});

reg("escrow", "cancel-escrow", {
  typescript: `const cancel = await agent.cancelEscrow(escrow.invoiceId);
// Funds returned to agent`,
  python: `cancel = await agent.cancel_escrow(escrow.invoice_id)`,
  go: `cancel, err := agent.CancelEscrow(ctx, escrow.InvoiceID)`,
  rust: `let cancel = agent.cancel_escrow(&escrow.invoice_id).await?;`,
  ruby: `cancel = agent.cancel_escrow(escrow.invoice_id)`,
  csharp: `var cancel = await agent.CancelEscrowAsync(escrow.InvoiceId);`,
  java: `var cancel = agent.cancelEscrow(escrow.invoiceId());`,
  swift: `let cancel = try await agent.cancelEscrow(escrow.invoiceId)`,
  elixir: `{:ok, cancel} = Remitmd.cancel_escrow(agent, escrow.invoice_id)`,
});

// ════════════════════════════════════════════════════════════
// TAB (Metered)
// ════════════════════════════════════════════════════════════

reg("tab", "get-contracts", {
  typescript: `const contracts = await agent.getContracts();`,
  python: `contracts = await agent.get_contracts()`,
  go: `contracts, err := agent.GetContracts(ctx)`,
  rust: `let contracts = agent.get_contracts().await?;`,
  ruby: `contracts = agent.get_contracts`,
  csharp: `var contracts = await agent.GetContractsAsync();`,
  java: `var contracts = agent.getContracts();`,
  swift: `let contracts = try await agent.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(agent)`,
});

reg("tab", "sign-permit", {
  typescript: `const permit = await agent.signPermit("tab", 20.00);`,
  python: `permit = await agent.sign_permit("tab", 20.00)`,
  go: `permit, err := agent.SignPermit(ctx, "tab", 20.00)`,
  rust: `let permit = agent.sign_permit("tab", 20.00).await?;`,
  ruby: `permit = agent.sign_permit("tab", 20.00)`,
  csharp: `var permit = await agent.SignPermitAsync("tab", 20.00m);`,
  java: `var permit = agent.signPermit("tab", 20.00);`,
  swift: `let permit = try await agent.signPermit(flow: "tab", amount: 20.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "tab", 20.00)`,
});

reg("tab", "open-tab", {
  typescript: `const tab = await agent.openTab({
  to: provider.address,
  limit: 20.00,
  perUnit: 0.10,
  permit,
});
// tab.id - use for charges + close`,
  python: `tab = await agent.open_tab(
    provider.address, 20.00, 0.10, permit=permit)`,
  go: `tab, err := agent.CreateTab(ctx, provider.Address(),
    decimal.NewFromFloat(20.00),
    decimal.NewFromFloat(0.10),
    payskill.WithTabPermit(permit))`,
  rust: `let tab = agent.create_tab_full(
    provider.address(),
    dec!(20.00), dec!(0.10),
    None, Some(permit),
).await?;`,
  ruby: `tab = agent.create_tab(
  provider.address, 20.00, 0.10, permit: permit)`,
  csharp: `var tab = await agent.CreateTabAsync(
    provider.Address, 20.00m, 0.10m, permit: permit);`,
  java: `var tab = agent.createTab(
    provider.address(), BigDecimal.valueOf(20.00),
    BigDecimal.valueOf(0.10), permit);`,
  swift: `let tab = try await agent.openTab(
    provider: provider.address, limitAmount: 20.00,
    perUnit: 0.10, permit: permit)`,
  elixir: `{:ok, tab} = Remitmd.create_tab(agent,
  provider.address, 20.00, 0.10, permit: permit)`,
});

reg("tab", "sign-close", {
  typescript: `// Provider signs final amount for close
const contracts = await provider.getContracts();
const sig = await provider.signTabCharge(
  contracts.tab, tab.id, BigInt(8_500_000), 2);`,
  python: `# Provider signs final amount for close
contracts = await provider.get_contracts()
sig = await provider.sign_tab_charge(
    contracts["tab"], tab.id, 8_500_000, 2)`,
  // Go and Rust: signTabCharge is not exported from the SDK
  ruby: `# Provider signs final amount for close
contracts = provider.get_contracts
sig = provider.sign_tab_charge(
  contracts.tab, tab.id, 8_500_000, 2)`,
  csharp: `// Provider signs final amount for close
var contracts = await provider.GetContractsAsync();
var sig = provider.SignTabCharge(
    contracts.Tab, tab.Id, 8_500_000, 2);`,
  java: `// Provider signs final amount for close
var contracts = provider.getContracts();
var sig = provider.signTabCharge(
    contracts.tab(), tab.id(), 8_500_000L, 2);`,
  swift: `// Provider signs final amount for close
let contracts = try await provider.getContracts()
let sig = try Wallet.signTabCharge(
    signer: providerSigner, tabContract: contracts.tab,
    tabId: tab.id, totalCharged: 8_500_000, callCount: 2)`,
  elixir: `# Provider signs final amount for close
{:ok, contracts} = Remitmd.get_contracts(provider)
{:ok, sig} = Remitmd.sign_tab_charge(provider,
  contracts.tab, tab.id, 8_500_000, 2)`,
});

reg("tab", "charge-1", {
  typescript: `const charge = await agent.chargeTab(tab.id, {
  amount: 3.50,
  cumulative: 3.50,
  callCount: 1,
  providerSig: sig,
});`,
  python: `charge = await agent.charge_tab(
    tab.id, 3.50, 3.50, 1, sig)`,
  go: `charge, err := agent.ChargeTab(ctx,
    tab.ID, 3.50, 3.50, 1, sig)`,
  rust: `let charge = agent.charge_tab(
    &tab.id, 3.50, 3.50, 1, &sig,
).await?;`,
  ruby: `charge = agent.charge_tab(tab.id, 3.50, 3.50, 1, sig)`,
  csharp: `var charge = await agent.ChargeTabAsync(
    tab.Id, 3.50m, 3.50m, 1, sig);`,
  java: `var charge = agent.chargeTab(tab.id(),
    BigDecimal.valueOf(3.50), BigDecimal.valueOf(3.50), 1, sig);`,
  swift: `let charge = try await agent.chargeTab(
    id: tab.id, amount: 3.50,
    cumulative: 3.50, callCount: 1, providerSig: sig)`,
  elixir: `{:ok, charge} = Remitmd.charge_tab(agent,
  tab.id, 3.50, 3.50, 1, sig)`,
});

reg("tab", "charge-2", {
  typescript: `// Second charge on the same tab
const charge2 = await agent.chargeTab(tab.id, {
  amount: 5.00,
  cumulative: 8.50,
  callCount: 2,
  providerSig: sig2,
});`,
  python: `# Second charge on the same tab
charge2 = await agent.charge_tab(
    tab.id, 5.00, 8.50, 2, sig2)`,
  go: `// Second charge on the same tab
charge2, err := agent.ChargeTab(ctx,
    tab.ID, 5.00, 8.50, 2, sig2)`,
  rust: `// Second charge on the same tab
let charge2 = agent.charge_tab(
    &tab.id, 5.00, 8.50, 2, &sig2,
).await?;`,
  ruby: `# Second charge on the same tab
charge2 = agent.charge_tab(tab.id, 5.00, 8.50, 2, sig2)`,
  csharp: `// Second charge on the same tab
var charge2 = await agent.ChargeTabAsync(
    tab.Id, 5.00m, 8.50m, 2, sig2);`,
  java: `// Second charge on the same tab
var charge2 = agent.chargeTab(tab.id(),
    BigDecimal.valueOf(5.00), BigDecimal.valueOf(8.50), 2, sig2);`,
  swift: `// Second charge on the same tab
let charge2 = try await agent.chargeTab(
    id: tab.id, amount: 5.00,
    cumulative: 8.50, callCount: 2, providerSig: sig2)`,
  elixir: `# Second charge on the same tab
{:ok, charge2} = Remitmd.charge_tab(agent,
  tab.id, 5.00, 8.50, 2, sig2)`,
});

reg("tab", "close-tab", {
  typescript: `const closed = await agent.closeTab(tab.id, {
  finalAmount: 8.50,
  providerSig: sig,
});
// Remaining balance returned to agent`,
  python: `closed = await agent.close_tab(
    tab.id, final_amount=8.50, provider_sig=sig)`,
  go: `closed, err := agent.CloseTab(ctx, tab.ID,
    payskill.WithCloseTabAmount(8.50),
    payskill.WithCloseTabSig(sig))`,
  rust: `let closed = agent.close_tab(&tab.id, 8.50, &sig).await?;`,
  ruby: `closed = agent.close_tab(tab.id,
  final_amount: 8.50, provider_sig: sig)`,
  csharp: `var closed = await agent.CloseTabAsync(tab.Id, 8.50m, sig);`,
  java: `var closed = agent.closeTab(
    tab.id(), BigDecimal.valueOf(8.50), sig);`,
  swift: `let closed = try await agent.closeTab(
    id: tab.id, finalAmount: 8.50, providerSig: sig)`,
  elixir: `{:ok, closed} = Remitmd.close_tab(agent, tab.id,
  final_amount: 8.50, provider_sig: sig)`,
});

// ════════════════════════════════════════════════════════════
// STREAM
// ════════════════════════════════════════════════════════════

reg("stream", "get-contracts", {
  typescript: `const contracts = await agent.getContracts();`,
  python: `contracts = await agent.get_contracts()`,
  go: `contracts, err := agent.GetContracts(ctx)`,
  rust: `let contracts = agent.get_contracts().await?;`,
  ruby: `contracts = agent.get_contracts`,
  csharp: `var contracts = await agent.GetContractsAsync();`,
  java: `var contracts = agent.getContracts();`,
  swift: `let contracts = try await agent.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(agent)`,
});

reg("stream", "sign-permit", {
  typescript: `const permit = await agent.signPermit("stream", 50.00);`,
  python: `permit = await agent.sign_permit("stream", 50.00)`,
  go: `permit, err := agent.SignPermit(ctx, "stream", 50.00)`,
  rust: `let permit = agent.sign_permit("stream", 50.00).await?;`,
  ruby: `permit = agent.sign_permit("stream", 50.00)`,
  csharp: `var permit = await agent.SignPermitAsync("stream", 50.00m);`,
  java: `var permit = agent.signPermit("stream", 50.00);`,
  swift: `let permit = try await agent.signPermit(flow: "stream", amount: 50.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "stream", 50.00)`,
});

reg("stream", "open-stream", {
  typescript: `const stream = await agent.openStream({
  to: provider.address,
  rate: 0.01,      // USDC per second
  maxTotal: 50.00,
  permit,
});`,
  python: `stream = await agent.open_stream(
    provider.address, 0.01,
    max_total=50.00, permit=permit)`,
  go: `stream, err := agent.CreateStream(ctx, provider.Address(),
    decimal.NewFromFloat(0.01),
    decimal.NewFromFloat(50.00),
    payskill.WithStreamPermit(permit))`,
  rust: `let stream = agent.create_stream(
    provider.address(),
    dec!(0.01), dec!(50.00),
).await?;`,
  ruby: `stream = agent.create_stream(
  provider.address, 0.01, 50.00, permit: permit)`,
  csharp: `var stream = await agent.CreateStreamAsync(
    provider.Address, 0.01m, 50.00m, permit);`,
  java: `var stream = agent.createStream(
    provider.address(), BigDecimal.valueOf(0.01),
    BigDecimal.valueOf(50.00), permit);`,
  swift: `let stream = try await agent.startStream(
    payee: provider.address, ratePerSecond: 0.01,
    maxTotal: 50.00, permit: permit)`,
  elixir: `{:ok, stream} = Remitmd.create_stream(agent,
  provider.address, 0.01, 50.00, permit: permit)`,
});

reg("stream", "close-stream", {
  typescript: `const closed = await agent.closeStream(stream.id);
// Accrued amount settled, remainder returned`,
  python: `closed = await agent.close_stream(stream.id)`,
  go: `closed, err := agent.CloseStream(ctx, stream.StreamID)`,
  rust: `let closed = agent.close_stream(&stream.id).await?;`,
  ruby: `closed = agent.close_stream(stream.id)`,
  csharp: `var closed = await agent.CloseStreamAsync(stream.StreamId);`,
  java: `var closed = agent.closeStream(stream.id());`,
  swift: `let closed = try await agent.closeStream(stream.id)`,
  elixir: `{:ok, closed} = Remitmd.close_stream(agent, stream.id)`,
});

// ════════════════════════════════════════════════════════════
// BOUNTY
// ════════════════════════════════════════════════════════════

reg("bounty", "get-contracts", {
  typescript: `const contracts = await agent.getContracts();`,
  python: `contracts = await agent.get_contracts()`,
  go: `contracts, err := agent.GetContracts(ctx)`,
  rust: `let contracts = agent.get_contracts().await?;`,
  ruby: `contracts = agent.get_contracts`,
  csharp: `var contracts = await agent.GetContractsAsync();`,
  java: `var contracts = agent.getContracts();`,
  swift: `let contracts = try await agent.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(agent)`,
});

reg("bounty", "sign-permit", {
  typescript: `const permit = await agent.signPermit("bounty", 250.00);`,
  python: `permit = await agent.sign_permit("bounty", 250.00)`,
  go: `permit, err := agent.SignPermit(ctx, "bounty", 250.00)`,
  rust: `let permit = agent.sign_permit("bounty", 250.00).await?;`,
  ruby: `permit = agent.sign_permit("bounty", 250.00)`,
  csharp: `var permit = await agent.SignPermitAsync("bounty", 250.00m);`,
  java: `var permit = agent.signPermit("bounty", 250.00);`,
  swift: `let permit = try await agent.signPermit(flow: "bounty", amount: 250.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "bounty", 250.00)`,
});

reg("bounty", "post-bounty", {
  typescript: `const bounty = await agent.postBounty({
  amount: 250.00,
  task: "Review PR #42 - security audit",
  deadline: Math.floor(Date.now() / 1000) + 86400,
  permit,
});`,
  python: `bounty = await agent.post_bounty(
    250.00,
    "Review PR #42 - security audit",
    int(time.time()) + 86400,
    permit=permit)`,
  go: `bounty, err := agent.CreateBounty(ctx,
    decimal.NewFromFloat(250.00),
    "Review PR #42 - security audit",
    time.Now().Unix() + 86400,
    payskill.WithBountyPermit(permit))`,
  rust: `let bounty = agent.create_bounty(
    dec!(250.00),
    "Review PR #42 - security audit",
    SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() + 86400,
).await?;`,
  ruby: `bounty = agent.create_bounty(
  250.00, "Review PR #42 - security audit",
  Time.now.to_i + 86400, permit: permit)`,
  csharp: `var bounty = await agent.CreateBountyAsync(
    250.00m, "Review PR #42 - security audit",
    86400, permit: permit);`,
  java: `var bounty = agent.createBounty(
    BigDecimal.valueOf(250.00),
    "Review PR #42 - security audit",
    Instant.now().getEpochSecond() + 86400, permit);`,
  swift: `let bounty = try await agent.postBounty(
    amount: 250.00,
    taskDescription: "Review PR #42 - security audit",
    deadline: Int(Date().timeIntervalSince1970) + 86400,
    permit: permit)`,
  elixir: `{:ok, bounty} = Remitmd.create_bounty(agent,
  250.00, "Review PR #42 - security audit",
  System.os_time(:second) + 86400, permit: permit)`,
});

reg("bounty", "submit-bounty", {
  typescript: `const submission = await provider.submitBounty(
  bounty.id,
  "0xab12...7f3e",
  "ipfs://QmX...audit-report",
);`,
  python: `submission = await provider.submit_bounty(
    bounty.id, "0xab12...7f3e",
    "ipfs://QmX...audit-report")`,
  go: `submission, err := provider.SubmitBounty(ctx, bounty.ID,
    "0xab12...7f3e", "ipfs://QmX...audit-report")`,
  rust: `let submission = provider.submit_bounty(
    &bounty.id, "0xab12...7f3e",
).await?;`,
  ruby: `submission = provider.submit_bounty(
  bounty.id, "0xab12...7f3e")`,
  csharp: `var submission = await provider.SubmitBountyAsync(
    bounty.Id, "0xab12...7f3e");`,
  java: `var submission = provider.submitBounty(
    bounty.id(), "0xab12...7f3e");`,
  swift: `let submission = try await provider.submitBounty(
    id: bounty.id,
    evidenceUri: "ipfs://QmX...audit-report")`,
  elixir: `{:ok, submission} = Remitmd.submit_bounty(provider,
  bounty.id, "0xab12...7f3e")`,
});

reg("bounty", "award-bounty", {
  typescript: `const result = await agent.awardBounty(
  bounty.id,
  submission.id
);
// result.txHash → on-chain settlement
// result.paidOut → 247.50 USDC (after 1% fee)`,
  python: `result = await agent.award_bounty(bounty.id, submission.id)`,
  go: `result, err := agent.AwardBounty(ctx, bounty.ID, submission.ID)`,
  rust: `let result = agent.award_bounty(&bounty.id, &submission.id).await?;`,
  ruby: `result = agent.award_bounty(bounty.id, submission.id)`,
  csharp: `var result = await agent.AwardBountyAsync(bounty.Id, submission.Id);`,
  java: `var result = agent.awardBounty(bounty.id(), submission.id());`,
  swift: `let result = try await agent.awardBounty(bounty.id, submissionId: submission.id)`,
  elixir: `{:ok, result} = Remitmd.award_bounty(agent, bounty.id, submission.id)`,
});

reg("bounty", "reclaim-bounty", {
  typescript: `// Reclaim after deadline expires - POST to server API
const resp = await fetch(\`\${apiUrl}/api/v1/bounties/\${bounty.id}/reclaim\`, {
  method: "POST",
  headers: authHeaders,
});
const reclaim = await resp.json();`,
  python: `# Reclaim after deadline expires - POST to server API
resp = await client.post(
    f"{api_url}/api/v1/bounties/{bounty.id}/reclaim")
reclaim = resp.json()`,
  go: `// Reclaim after deadline expires - POST to server API
req, _ := http.NewRequest("POST",
    fmt.Sprintf("%s/api/v1/bounties/%s/reclaim", apiURL, bounty.ID), nil)
resp, err := authClient.Do(req)`,
  rust: `// Reclaim after deadline expires - POST to server API
let reclaim = auth_client
    .post(format!("{api_url}/api/v1/bounties/{}/reclaim", bounty.id))
    .send().await?.json::<serde_json::Value>().await?;`,
  ruby: `# Reclaim after deadline expires - POST to server API
resp = auth_client.post(
  "#{api_url}/api/v1/bounties/#{bounty.id}/reclaim")
reclaim = JSON.parse(resp.body)`,
  csharp: `// Reclaim after deadline expires - POST to server API
var resp = await authClient.PostAsync(
    $"{apiUrl}/api/v1/bounties/{bounty.Id}/reclaim", null);
var reclaim = await resp.Content.ReadFromJsonAsync<JsonObject>();`,
  java: `// Reclaim after deadline expires - POST to server API
var resp = authClient.send(
    HttpRequest.newBuilder(URI.create(
        apiUrl + "/api/v1/bounties/" + bounty.id() + "/reclaim"))
        .POST(HttpRequest.BodyPublishers.noBody()).build(),
    HttpResponse.BodyHandlers.ofString());`,
  swift: `// Reclaim after deadline expires - POST to server API
var req = URLRequest(url: URL(string:
    "\\(apiUrl)/api/v1/bounties/\\(bounty.id)/reclaim")!)
req.httpMethod = "POST"
let (data, _) = try await authSession.data(for: req)`,
  elixir: `# Reclaim after deadline expires - POST to server API
{:ok, resp} = auth_client.post(
  "#{api_url}/api/v1/bounties/#{bounty.id}/reclaim")
reclaim = Jason.decode!(resp.body)`,
});

// ════════════════════════════════════════════════════════════
// DEPOSIT
// ════════════════════════════════════════════════════════════

reg("deposit", "get-contracts", {
  typescript: `const contracts = await agent.getContracts();`,
  python: `contracts = await agent.get_contracts()`,
  go: `contracts, err := agent.GetContracts(ctx)`,
  rust: `let contracts = agent.get_contracts().await?;`,
  ruby: `contracts = agent.get_contracts`,
  csharp: `var contracts = await agent.GetContractsAsync();`,
  java: `var contracts = agent.getContracts();`,
  swift: `let contracts = try await agent.getContracts()`,
  elixir: `{:ok, contracts} = Remitmd.get_contracts(agent)`,
});

reg("deposit", "sign-permit", {
  typescript: `const permit = await agent.signPermit("deposit", 100.00);`,
  python: `permit = await agent.sign_permit("deposit", 100.00)`,
  go: `permit, err := agent.SignPermit(ctx, "deposit", 100.00)`,
  rust: `let permit = agent.sign_permit("deposit", 100.00).await?;`,
  ruby: `permit = agent.sign_permit("deposit", 100.00)`,
  csharp: `var permit = await agent.SignPermitAsync("deposit", 100.00m);`,
  java: `var permit = agent.signPermit("deposit", 100.00);`,
  swift: `let permit = try await agent.signPermit(flow: "deposit", amount: 100.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "deposit", 100.00)`,
});

reg("deposit", "place-deposit", {
  typescript: `const deposit = await agent.placeDeposit({
  to: provider.address,
  amount: 100.00,
  expires: 86400,
  permit,
});`,
  python: `deposit = await agent.place_deposit(
    provider.address, 100.00, 86400, permit=permit)`,
  go: `deposit, err := agent.PlaceDeposit(ctx, provider.Address(),
    decimal.NewFromFloat(100.00),
    1*time.Hour,
    payskill.WithDepositPermit(permit))`,
  rust: `let deposit = agent.lock_deposit_full(
    provider.address(),
    dec!(100.00), 86400,
    Some(permit),
).await?;`,
  ruby: `deposit = agent.place_deposit(
  provider.address, 100.00,
  expires_in_secs: 86400, permit: permit)`,
  csharp: `var deposit = await agent.LockDepositAsync(
    provider.Address, 100.00m, 86400, permit);`,
  java: `var deposit = agent.lockDeposit(
    provider.address(), BigDecimal.valueOf(100.00),
    86400, permit);`,
  swift: `let deposit = try await agent.placeDeposit(
    provider: provider.address, amount: 100.00,
    expiresIn: 86400, permit: permit)`,
  elixir: `{:ok, deposit} = Remitmd.place_deposit(agent,
  provider.address, 100.00,
  expires_in: 86400, permit: permit)`,
});

reg("deposit", "return-deposit", {
  typescript: `const returned = await provider.returnDeposit(deposit.id);
// Full amount returned to the depositor (agent)`,
  python: `returned = await provider.return_deposit(deposit.id)`,
  go: `returned, err := provider.ReturnDeposit(ctx, deposit.DepositID)`,
  rust: `let returned = provider.return_deposit(&deposit.id).await?;`,
  ruby: `returned = provider.return_deposit(deposit.id)`,
  csharp: `var returned = await provider.ReturnDepositAsync(deposit.DepositId);`,
  java: `var returned = provider.returnDeposit(deposit.id());`,
  swift: `let returned = try await provider.returnDeposit(deposit.id)`,
  elixir: `{:ok, returned} = Remitmd.return_deposit(provider, deposit.id)`,
});

reg("deposit", "forfeit-deposit", {
  typescript: `// Provider claims deposit - POST to server API
const resp = await fetch(\`\${apiUrl}/api/v1/deposits/\${deposit.id}/forfeit\`, {
  method: "POST",
  headers: authHeaders,
});
const forfeited = await resp.json();`,
  python: `# Provider claims deposit - POST to server API
resp = await client.post(
    f"{api_url}/api/v1/deposits/{deposit.id}/forfeit")
forfeited = resp.json()`,
  go: `// Provider claims deposit - POST to server API
req, _ := http.NewRequest("POST",
    fmt.Sprintf("%s/api/v1/deposits/%s/forfeit", apiURL, deposit.DepositID), nil)
resp, err := authClient.Do(req)`,
  rust: `// Provider claims deposit - POST to server API
let forfeited = auth_client
    .post(format!("{api_url}/api/v1/deposits/{}/forfeit", deposit.id))
    .send().await?.json::<serde_json::Value>().await?;`,
  ruby: `# Provider claims deposit - POST to server API
resp = auth_client.post(
  "#{api_url}/api/v1/deposits/#{deposit.id}/forfeit")
forfeited = JSON.parse(resp.body)`,
  csharp: `// Provider claims deposit - POST to server API
var resp = await authClient.PostAsync(
    $"{apiUrl}/api/v1/deposits/{deposit.DepositId}/forfeit", null);
var forfeited = await resp.Content.ReadFromJsonAsync<JsonObject>();`,
  java: `// Provider claims deposit - POST to server API
var resp = authClient.send(
    HttpRequest.newBuilder(URI.create(
        apiUrl + "/api/v1/deposits/" + deposit.id() + "/forfeit"))
        .POST(HttpRequest.BodyPublishers.noBody()).build(),
    HttpResponse.BodyHandlers.ofString());`,
  swift: `// Provider claims deposit - POST to server API
var req = URLRequest(url: URL(string:
    "\\(apiUrl)/api/v1/deposits/\\(deposit.id)/forfeit")!)
req.httpMethod = "POST"
let (data, _) = try await authSession.data(for: req)`,
  elixir: `# Provider claims deposit - POST to server API
{:ok, resp} = auth_client.post(
  "#{api_url}/api/v1/deposits/#{deposit.id}/forfeit")
forfeited = Jason.decode!(resp.body)`,
});

// ════════════════════════════════════════════════════════════
// x402 HTTP PAYMENT
// ════════════════════════════════════════════════════════════

reg("x402", "discover", {
  typescript: `// Check if server supports x402 payments
const supported = await fetch(apiUrl + "/x402/supported");
const schemes = await supported.json();
// { schemes: ["exact"], assets: ["USDC"], networks: ["eip155:84532"] }`,
  python: `# Check if server supports x402 payments
import httpx
resp = httpx.get(f"{api_url}/x402/supported")
schemes = resp.json()`,
  go: `resp, err := http.Get(apiURL + "/x402/supported")
defer resp.Body.Close()
var schemes map[string]interface{}
json.NewDecoder(resp.Body).Decode(&schemes)`,
  rust: `let resp = reqwest::get(format!("{api_url}/x402/supported"))
    .await?.json::<serde_json::Value>().await?;
// resp["schemes"], resp["assets"], resp["networks"]`,
  ruby: `resp = Net::HTTP.get(URI("#{api_url}/x402/supported"))
schemes = JSON.parse(resp)`,
  csharp: `var resp = await httpClient.GetAsync($"{apiUrl}/x402/supported");
var schemes = await resp.Content.ReadFromJsonAsync<JsonObject>();`,
  java: `var resp = httpClient.send(
    HttpRequest.newBuilder(URI.create(apiUrl + "/x402/supported")).build(),
    HttpResponse.BodyHandlers.ofString());
var schemes = new ObjectMapper().readTree(resp.body());`,
  swift: `let (data, _) = try await URLSession.shared.data(
    from: URL(string: "\\(apiUrl)/x402/supported")!)
let schemes = try JSONDecoder().decode([String: [String]].self, from: data)`,
  elixir: `{:ok, resp} = HTTPoison.get("#{api_url}/x402/supported")
schemes = Jason.decode!(resp.body)`,
});

reg("x402", "request-resource", {
  typescript: `// Request protected resource - expect HTTP 402
const res = await fetch(apiUrl + "/x402/demo");
// res.status === 402
// X-Payment-Scheme, X-Payment-Amount, X-Payment-Asset, X-Payment-PayTo`,
  python: `# Request protected resource - expect HTTP 402
resp = httpx.get(f"{api_url}/x402/demo")
# resp.status_code == 402
# resp.headers["X-Payment-Amount"], etc.`,
  go: `resp, _ := http.Get(apiURL + "/x402/demo")
// resp.StatusCode == 402
// resp.Header.Get("X-Payment-Amount")`,
  rust: `let resp = reqwest::get(format!("{api_url}/x402/demo")).await?;
// resp.status() == 402
// resp.headers()["x-payment-amount"]`,
  ruby: `resp = Net::HTTP.get_response(URI("#{api_url}/x402/demo"))
# resp.code == "402"
# resp["X-Payment-Amount"]`,
  csharp: `var resp = await httpClient.GetAsync($"{apiUrl}/x402/demo");
// resp.StatusCode == HttpStatusCode.PaymentRequired
// resp.Headers.GetValues("X-Payment-Amount")`,
  java: `var resp = httpClient.send(
    HttpRequest.newBuilder(URI.create(apiUrl + "/x402/demo")).build(),
    HttpResponse.BodyHandlers.ofString());
// resp.statusCode() == 402`,
  swift: `let (_, resp) = try await URLSession.shared.data(
    from: URL(string: "\\(apiUrl)/x402/demo")!)
// (resp as! HTTPURLResponse).statusCode == 402`,
  elixir: `{:ok, resp} = HTTPoison.get("#{api_url}/x402/demo")
# resp.status_code == 402
# Enum.find(resp.headers, &(elem(&1, 0) == "X-Payment-Amount"))`,
});

reg("x402", "sign-authorization", {
  typescript: `// x402Fetch auto-handles 402 → sign → retry in one call
const { response, lastPayment } = await agent.x402Fetch(
  apiUrl + "/x402/demo",
  5.00,  // max auto-pay in USDC
);
// response is the paid-for response, lastPayment has payment details`,
  python: `# x402_fetch auto-handles 402 → sign → retry in one call
result = await agent.x402_fetch(
    f"{api_url}/x402/demo",
    max_auto_pay=5.00,
)
# result.response, result.last_payment`,
  go: `// X402Fetch auto-handles 402 → sign → retry in one call
result, err := agent.X402Fetch(ctx, apiUrl+"/x402/demo", 5.00)
// result.Response, result.LastPayment`,
  rust: `// x402_fetch auto-handles 402 → sign → retry in one call
let result = agent.x402_fetch(
    &format!("{api_url}/x402/demo"), 5.00,
).await?;
// result.response, result.last_payment`,
  ruby: `# x402_fetch auto-handles 402 → sign → retry in one call
result = agent.x402_fetch("#{api_url}/x402/demo", max_auto_pay: 5.00)
# result.response, result.last_payment`,
  csharp: `// X402FetchAsync auto-handles 402 → sign → retry in one call
var result = await agent.X402FetchAsync(
    apiUrl + "/x402/demo", maxAutoPayUsdc: 5.00m);
// result.Response, result.LastPayment`,
  java: `// x402Fetch auto-handles 402 → sign → retry in one call
var result = agent.x402Fetch(apiUrl + "/x402/demo", 5.00);
// result.response(), result.lastPayment()`,
  swift: `// x402Fetch auto-handles 402 → sign → retry in one call
let result = try await agent.x402Fetch(
    URL(string: "\\(apiUrl)/x402/demo")!, maxAutoPayUsdc: 5.00)
// result.response, result.lastPayment`,
  elixir: `# x402_fetch auto-handles 402 → sign → retry in one call
{:ok, result} = Remitmd.x402_fetch(agent,
  "#{api_url}/x402/demo", max_auto_pay: 5.00)
# result.response, result.last_payment`,
});

reg("x402", "settle", {
  typescript: `// Provider settles payment on-chain
const settle = await fetch(apiUrl + "/x402/settle", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders },
  body: JSON.stringify({ paymentPayload, paymentRequired }),
});
const { tx_hash } = await settle.json();`,
  python: `# Provider settles payment on-chain
resp = httpx.post(
    f"{api_url}/x402/settle",
    headers=auth_headers,
    json={"paymentPayload": payload, "paymentRequired": required},
)
tx_hash = resp.json()["tx_hash"]`,
  go: `body, _ := json.Marshal(map[string]interface{}{
    "paymentPayload": payload, "paymentRequired": required,
})
req, _ := http.NewRequest("POST", apiURL+"/x402/settle",
    bytes.NewReader(body))
req.Header.Set("Content-Type", "application/json")
resp, _ := http.DefaultClient.Do(req)`,
  rust: `let resp = reqwest::Client::new()
    .post(format!("{api_url}/x402/settle"))
    .json(&serde_json::json!({
        "paymentPayload": payload,
        "paymentRequired": required,
    }))
    .send().await?.json::<serde_json::Value>().await?;
let tx_hash = &resp["tx_hash"];`,
  ruby: `resp = Net::HTTP.post(
  URI("#{api_url}/x402/settle"),
  { paymentPayload: payload, paymentRequired: required }.to_json,
  "Content-Type" => "application/json",
)
tx_hash = JSON.parse(resp.body)["tx_hash"]`,
  csharp: `var resp = await httpClient.PostAsJsonAsync($"{apiUrl}/x402/settle",
    new { paymentPayload = payload, paymentRequired = required });
var result = await resp.Content.ReadFromJsonAsync<JsonObject>();
var txHash = result["tx_hash"].GetValue<string>();`,
  java: `var body = new ObjectMapper().writeValueAsString(Map.of(
    "paymentPayload", payload, "paymentRequired", required));
var resp = httpClient.send(
    HttpRequest.newBuilder(URI.create(apiUrl + "/x402/settle"))
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .header("Content-Type", "application/json").build(),
    HttpResponse.BodyHandlers.ofString());`,
  swift: `var req = URLRequest(url: URL(string: "\\(apiUrl)/x402/settle")!)
req.httpMethod = "POST"
req.setValue("application/json", forHTTPHeaderField: "Content-Type")
req.httpBody = try JSONEncoder().encode([
    "paymentPayload": payload, "paymentRequired": required])
let (data, _) = try await URLSession.shared.data(for: req)`,
  elixir: `{:ok, resp} = HTTPoison.post("#{api_url}/x402/settle",
  Jason.encode!(%{paymentPayload: payload, paymentRequired: required}),
  [{"Content-Type", "application/json"}])
%{"tx_hash" => tx_hash} = Jason.decode!(resp.body)`,
});

reg("x402", "receive-resource", {
  typescript: `// Re-fetch with payment proof - get the real resource
const resource = await fetch(apiUrl + "/x402/demo", {
  headers: { "X-Payment-Response": txHash },
});
const weatherData = await resource.json();
// { location: "...", temperature: ..., conditions: "..." }`,
  python: `# Re-fetch with payment proof - get the real resource
resp = httpx.get(
    f"{api_url}/x402/demo",
    headers={"X-Payment-Response": tx_hash},
)
weather_data = resp.json()`,
  go: `req, _ := http.NewRequest("GET", apiURL+"/x402/demo", nil)
req.Header.Set("X-Payment-Response", txHash)
resp, _ := http.DefaultClient.Do(req)
var weather map[string]interface{}
json.NewDecoder(resp.Body).Decode(&weather)`,
  rust: `let weather = reqwest::Client::new()
    .get(format!("{api_url}/x402/demo"))
    .header("X-Payment-Response", &tx_hash)
    .send().await?.json::<serde_json::Value>().await?;`,
  ruby: `uri = URI("#{api_url}/x402/demo")
req = Net::HTTP::Get.new(uri)
req["X-Payment-Response"] = tx_hash
resp = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |h| h.request(req) }
weather = JSON.parse(resp.body)`,
  csharp: `var req = new HttpRequestMessage(HttpMethod.Get, $"{apiUrl}/x402/demo");
req.Headers.Add("X-Payment-Response", txHash);
var resp = await httpClient.SendAsync(req);
var weather = await resp.Content.ReadFromJsonAsync<JsonObject>();`,
  java: `var resp = httpClient.send(
    HttpRequest.newBuilder(URI.create(apiUrl + "/x402/demo"))
        .header("X-Payment-Response", txHash).build(),
    HttpResponse.BodyHandlers.ofString());
var weather = new ObjectMapper().readTree(resp.body());`,
  swift: `var req = URLRequest(url: URL(string: "\\(apiUrl)/x402/demo")!)
req.setValue(txHash, forHTTPHeaderField: "X-Payment-Response")
let (data, _) = try await URLSession.shared.data(for: req)
let weather = try JSONDecoder().decode([String: AnyCodable].self, from: data)`,
  elixir: `{:ok, resp} = HTTPoison.get("#{api_url}/x402/demo",
  [{"X-Payment-Response", tx_hash}])
weather = Jason.decode!(resp.body)`,
});

reg("x402", "protected-resource", {
  typescript: `// The paid resource - real-time weather data
const { location, current } = weather;
console.log(\`Weather in \${location.name}: \${current.condition.text}\`);
console.log(\`  Temperature: \${current.temp_f}°F / \${current.temp_c}°C\`);
console.log(\`  Humidity: \${current.humidity}%, Wind: \${current.wind_mph} mph\`);`,
  python: `# The paid resource - real-time weather data
loc = weather["location"]
cur = weather["current"]
print(f"Weather in {loc['name']}: {cur['condition']['text']}")
print(f"  Temperature: {cur['temp_f']}°F / {cur['temp_c']}°C")
print(f"  Humidity: {cur['humidity']}%, Wind: {cur['wind_mph']} mph")`,
  go: `// The paid resource - real-time weather data
loc := weather["location"].(map[string]any)
cur := weather["current"].(map[string]any)
cond := cur["condition"].(map[string]any)
fmt.Printf("Weather in %s: %s\\n", loc["name"], cond["text"])
fmt.Printf("  Temp: %.0f°F, Humidity: %.0f%%\\n", cur["temp_f"], cur["humidity"])`,
  rust: `// The paid resource - real-time weather data
let loc = &weather["location"];
let cur = &weather["current"];
println!("Weather in {}: {}", loc["name"], cur["condition"]["text"]);
println!("  Temp: {}°F / {}°C", cur["temp_f"], cur["temp_c"]);
println!("  Humidity: {}%, Wind: {} mph", cur["humidity"], cur["wind_mph"]);`,
  ruby: `# The paid resource - real-time weather data
loc = weather["location"]
cur = weather["current"]
puts "Weather in #{loc['name']}: #{cur['condition']['text']}"
puts "  Temp: #{cur['temp_f']}°F, Humidity: #{cur['humidity']}%"`,
  csharp: `// The paid resource - real-time weather data
var loc = weather.Location;
var cur = weather.Current;
Console.WriteLine($"Weather in {loc.Name}: {cur.Condition.Text}");
Console.WriteLine($"  Temp: {cur.TempF}°F, Humidity: {cur.Humidity}%");`,
  java: `// The paid resource - real-time weather data
var loc = weather.get("location");
var cur = weather.get("current");
System.out.printf("Weather in %s: %s%n",
    loc.get("name"), cur.get("condition").get("text"));
System.out.printf("  Temp: %s°F, Humidity: %s%%%n",
    cur.get("temp_f"), cur.get("humidity"));`,
  swift: `// The paid resource - real-time weather data
let loc = weather["location"] as! [String: Any]
let cur = weather["current"] as! [String: Any]
let cond = cur["condition"] as! [String: Any]
print("Weather in \\(loc["name"]!): \\(cond["text"]!)")
print("  Temp: \\(cur["temp_f"]!)°F, Humidity: \\(cur["humidity"]!)%")`,
  elixir: `# The paid resource - real-time weather data
loc = weather["location"]
cur = weather["current"]
IO.puts("Weather in #{loc["name"]}: #{cur["condition"]["text"]}")
IO.puts("  Temp: #{cur["temp_f"]}°F, Humidity: #{cur["humidity"]}%")`,
});

reg("x402", "webhook-settled", {
  typescript: `// Handle x402 settlement confirmation
app.post("/webhooks", (req, res) => {
  const { event, data } = req.body;
  if (event === "x402.settled") {
    console.log(\`x402 settled: \${data.txHash}\`);
    // Grant access to the protected resource
  }
  res.sendStatus(200);
});`,
  python: `# Handle x402 settlement confirmation
@app.post("/webhooks")
async def handle_webhook(request):
    body = await request.json()
    if body["event"] == "x402.settled":
        print(f"x402 settled: {body['data']['txHash']}")
    return {"ok": True}`,
  go: `// Handle x402 settlement confirmation
http.HandleFunc("/webhooks", func(w http.ResponseWriter, r *http.Request) {
    var ev payskill.WebhookEvent
    json.NewDecoder(r.Body).Decode(&ev)
    if ev.Event == "x402.settled" {
        log.Printf("x402 settled: %s", ev.Data.TxHash)
    }
    w.WriteHeader(200)
})`,
  rust: `// Handle x402 settlement confirmation
async fn handle_webhook(Json(ev): Json<WebhookEvent>) -> StatusCode {
    if ev.event == "x402.settled" {
        println!("x402 settled: {}", ev.data.tx_hash);
    }
    StatusCode::OK
}`,
  ruby: `# Handle x402 settlement confirmation
post "/webhooks" do
  ev = JSON.parse(request.body.read)
  if ev["event"] == "x402.settled"
    puts "x402 settled: #{ev['data']['txHash']}"
  end
  status 200
end`,
  csharp: `// Handle x402 settlement confirmation
app.MapPost("/webhooks", (WebhookEvent ev) => {
    if (ev.Event == "x402.settled")
        Console.WriteLine($"x402 settled: {ev.Data.TxHash}");
    return Results.Ok();
});`,
  java: `// Handle x402 settlement confirmation
@PostMapping("/webhooks")
ResponseEntity<Void> handleWebhook(@RequestBody WebhookEvent ev) {
    if ("x402.settled".equals(ev.getEvent()))
        log.info("x402 settled: {}", ev.getData().getTxHash());
    return ResponseEntity.ok().build();
}`,
  swift: `// Handle x402 settlement confirmation
app.post("webhooks") { req -> HTTPStatus in
    let ev = try req.content.decode(WebhookEvent.self)
    if ev.event == "x402.settled" {
        print("x402 settled: \\(ev.data.txHash)")
    }
    return .ok
}`,
  elixir: `# Handle x402 settlement confirmation
post "/webhooks" do
  {:ok, body, conn} = Plug.Conn.read_body(conn)
  ev = Jason.decode!(body)
  if ev["event"] == "x402.settled" do
    IO.puts("x402 settled: #{ev["data"]["txHash"]}")
  end
  send_resp(conn, 200, "ok")
end`,
});

// ── Webhook helper ──────────────────────────────────────────
// Generates all 9 language samples for a webhook event handler.

function wh(flowId: string, stepId: string, event: string, desc: string): void {
  reg(flowId, stepId, {
    typescript: `// Handle ${event} webhook
app.post("/webhooks", (req, res) => {
  if (req.body.event === "${event}") {
    console.log("${desc}", req.body.data);
  }
  res.sendStatus(200);
});`,
    python: `# Handle ${event} webhook
@app.post("/webhooks")
async def handle_webhook(request):
    body = await request.json()
    if body["event"] == "${event}":
        print("${desc}", body["data"])
    return {"ok": True}`,
    go: `// Handle ${event} webhook
http.HandleFunc("/webhooks", func(w http.ResponseWriter, r *http.Request) {
    var ev payskill.WebhookEvent
    json.NewDecoder(r.Body).Decode(&ev)
    if ev.Event == "${event}" {
        log.Printf("${desc}: %+v", ev.Data)
    }
    w.WriteHeader(200)
})`,
    rust: `// Handle ${event} webhook
async fn handle_webhook(Json(ev): Json<WebhookEvent>) -> StatusCode {
    if ev.event == "${event}" {
        println!("${desc}: {:?}", ev.data);
    }
    StatusCode::OK
}`,
    ruby: `# Handle ${event} webhook
post "/webhooks" do
  ev = JSON.parse(request.body.read)
  if ev["event"] == "${event}"
    puts "${desc}: #{ev['data']}"
  end
  status 200
end`,
    csharp: `// Handle ${event} webhook
app.MapPost("/webhooks", (WebhookEvent ev) => {
    if (ev.Event == "${event}")
        Console.WriteLine($"${desc}: {ev.Data}");
    return Results.Ok();
});`,
    java: `// Handle ${event} webhook
@PostMapping("/webhooks")
ResponseEntity<Void> handleWebhook(@RequestBody WebhookEvent ev) {
    if ("${event}".equals(ev.getEvent()))
        log.info("${desc}: {}", ev.getData());
    return ResponseEntity.ok().build();
}`,
    swift: `// Handle ${event} webhook
app.post("webhooks") { req -> HTTPStatus in
    let ev = try req.content.decode(WebhookEvent.self)
    if ev.event == "${event}" {
        print("${desc}: \\(ev.data)")
    }
    return .ok
}`,
    elixir: `# Handle ${event} webhook
post "/webhooks" do
  {:ok, body, conn} = Plug.Conn.read_body(conn)
  ev = Jason.decode!(body)
  if ev["event"] == "${event}" do
    IO.puts("${desc}: #{inspect(ev["data"])}")
  end
  send_resp(conn, 200, "ok")
end`,
  });
}

// ════════════════════════════════════════════════════════════
// WEBHOOK EVENTS - escrow, tab, stream, bounty, deposit
// ════════════════════════════════════════════════════════════

wh("escrow", "webhook-funded", "escrow.funded", "Escrow funded");
wh("escrow", "webhook-released", "escrow.released", "Escrow released");
wh("escrow", "webhook-cancelled", "escrow.cancelled", "Escrow cancelled");

wh("tab", "webhook-opened", "tab.opened", "Tab opened");
wh("tab", "webhook-charged-1", "tab.charged", "Tab charged");
wh("tab", "webhook-closed", "tab.closed", "Tab closed");

wh("stream", "webhook-opened", "stream.opened", "Stream opened");
wh("stream", "webhook-closed", "stream.closed", "Stream closed");

wh("bounty", "webhook-posted", "bounty.posted", "Bounty posted");
wh("bounty", "webhook-awarded", "bounty.awarded", "Bounty awarded");
wh("bounty", "webhook-expired", "bounty.expired", "Bounty expired");

wh("deposit", "webhook-created", "deposit.created", "Deposit created");
wh("deposit", "webhook-returned", "deposit.returned", "Deposit returned");
wh("deposit", "webhook-forfeited", "deposit.forfeited", "Deposit forfeited");

// ════════════════════════════════════════════════════════════
// DECISION POINTS - UI-only branching steps, no SDK call
// ════════════════════════════════════════════════════════════

reg("escrow", "decide", {
  typescript: `// Decision point: review work, then call either
// agent.releaseEscrow(escrow.invoiceId)   → pay provider
// agent.cancelEscrow(escrow.invoiceId)    → refund agent`,
  python: `# Decision point: review work, then call either
# agent.release_escrow(escrow.invoice_id)   → pay provider
# agent.cancel_escrow(escrow.invoice_id)    → refund agent`,
  go: `// Decision point: review work, then call either
// agent.ReleaseEscrow(ctx, escrow.InvoiceID)   → pay provider
// agent.CancelEscrow(ctx, escrow.InvoiceID)    → refund agent`,
  rust: `// Decision point: review work, then call either
// agent.release_escrow(&escrow.invoice_id)   → pay provider
// agent.cancel_escrow(&escrow.invoice_id)    → refund agent`,
  ruby: `# Decision point: review work, then call either
# agent.release_escrow(escrow.invoice_id)   → pay provider
# agent.cancel_escrow(escrow.invoice_id)    → refund agent`,
  csharp: `// Decision point: review work, then call either
// agent.ReleaseEscrowAsync(escrow.InvoiceId)   → pay provider
// agent.CancelEscrowAsync(escrow.InvoiceId)    → refund agent`,
  java: `// Decision point: review work, then call either
// agent.releaseEscrow(escrow.invoiceId())   → pay provider
// agent.cancelEscrow(escrow.invoiceId())    → refund agent`,
  swift: `// Decision point: review work, then call either
// agent.releaseEscrow(escrow.invoiceId)   → pay provider
// agent.cancelEscrow(escrow.invoiceId)    → refund agent`,
  elixir: `# Decision point: review work, then call either
# Remitmd.release_escrow(agent, escrow.invoice_id)   → pay provider
# Remitmd.cancel_escrow(agent, escrow.invoice_id)    → refund agent`,
});

reg("bounty", "decide", {
  typescript: `// Decision point: review submission, then call either
// agent.awardBounty(bounty.id, submission.id)  → pay provider
// (or let deadline expire to reclaim)`,
  python: `# Decision point: review submission, then call either
# agent.award_bounty(bounty.id, submission.id)  → pay provider
# (or let deadline expire to reclaim)`,
  go: `// Decision point: review submission, then call either
// agent.AwardBounty(ctx, bounty.ID, submission.ID)  → pay provider
// (or let deadline expire to reclaim)`,
  rust: `// Decision point: review submission, then call either
// agent.award_bounty(&bounty.id, &submission.id)  → pay provider
// (or let deadline expire to reclaim)`,
  ruby: `# Decision point: review submission, then call either
# agent.award_bounty(bounty.id, submission.id)  → pay provider
# (or let deadline expire to reclaim)`,
  csharp: `// Decision point: review submission, then call either
// agent.AwardBountyAsync(bounty.Id, submission.Id)  → pay provider
// (or let deadline expire to reclaim)`,
  java: `// Decision point: review submission, then call either
// agent.awardBounty(bounty.id(), submission.id())  → pay provider
// (or let deadline expire to reclaim)`,
  swift: `// Decision point: review submission, then call either
// agent.awardBounty(bounty.id, submissionId: submission.id)  → pay provider
// (or let deadline expire to reclaim)`,
  elixir: `# Decision point: review submission, then call either
# Remitmd.award_bounty(agent, bounty.id, submission.id)  → pay provider
# (or let deadline expire to reclaim)`,
});

reg("deposit", "decide", {
  typescript: `// Decision point: provider reviews deposit, then calls either
// provider.returnDeposit(deposit.id)  → return to depositor
// POST /api/v1/deposits/{id}/forfeit         → claim deposit`,
  python: `# Decision point: provider reviews deposit, then calls either
# provider.return_deposit(deposit.id)  → return to depositor
# POST /api/v1/deposits/{id}/forfeit          → claim deposit`,
  go: `// Decision point: provider reviews deposit, then calls either
// provider.ReturnDeposit(ctx, deposit.DepositID)  → return to depositor
// POST /api/v1/deposits/{id}/forfeit              → claim deposit`,
  rust: `// Decision point: provider reviews deposit, then calls either
// provider.return_deposit(&deposit.id)  → return to depositor
// POST /api/v1/deposits/{id}/forfeit            → claim deposit`,
  ruby: `# Decision point: provider reviews deposit, then calls either
# provider.return_deposit(deposit.id)  → return to depositor
# POST /api/v1/deposits/{id}/forfeit           → claim deposit`,
  csharp: `// Decision point: provider reviews deposit, then calls either
// provider.ReturnDepositAsync(deposit.DepositId)  → return to depositor
// POST /api/v1/deposits/{id}/forfeit              → claim deposit`,
  java: `// Decision point: provider reviews deposit, then calls either
// provider.returnDeposit(deposit.id())  → return to depositor
// POST /api/v1/deposits/{id}/forfeit           → claim deposit`,
  swift: `// Decision point: provider reviews deposit, then calls either
// provider.returnDeposit(deposit.id)  → return to depositor
// POST /api/v1/deposits/{id}/forfeit         → claim deposit`,
  elixir: `# Decision point: provider reviews deposit, then calls either
# Remitmd.return_deposit(provider, deposit.id)  → return to depositor
# POST /api/v1/deposits/{id}/forfeit                    → claim deposit`,
});

reg("stream", "accrue", {
  typescript: `// Funds accrue continuously - check accrued amount
const stream = await agent.getStream(stream.id);
console.log("Accrued:", stream.accrued, "USDC");`,
  python: `# Funds accrue continuously - check accrued amount
stream = await agent.get_stream(stream.id)
print(f"Accrued: {stream.accrued} USDC")`,
  go: `// Funds accrue continuously - check accrued amount
s, err := agent.GetStream(ctx, stream.StreamID)
log.Printf("Accrued: %s USDC", s.Accrued)`,
  rust: `// Funds accrue continuously - check accrued amount
let s = agent.get_stream(&stream.id).await?;
println!("Accrued: {} USDC", s.accrued);`,
  ruby: `# Funds accrue continuously - check accrued amount
s = agent.get_stream(stream.id)
puts "Accrued: #{s.accrued} USDC"`,
  csharp: `// Funds accrue continuously - check accrued amount
var s = await agent.GetStreamAsync(stream.StreamId);
Console.WriteLine($"Accrued: {s.Accrued} USDC");`,
  java: `// Funds accrue continuously - check accrued amount
var s = agent.getStream(stream.id());
System.out.printf("Accrued: %s USDC%n", s.getAccrued());`,
  swift: `// Funds accrue continuously - check accrued amount
let s = try await agent.getStream(stream.id)
print("Accrued: \\(s.accrued) USDC")`,
  elixir: `# Funds accrue continuously - check accrued amount
{:ok, s} = Remitmd.get_stream(agent, stream.id)
IO.puts("Accrued: #{s.accrued} USDC")`,
});

// ════════════════════════════════════════════════════════════
// AP2 DISCOVERY - agent card + capability enumeration
// ════════════════════════════════════════════════════════════

reg("ap2-discovery", "fetch-card", {
  typescript: `import { discoverAgent } from "@pay-skill/sdk";

const card = await discoverAgent("https://pay");
// card.name, card.url, card.capabilities, card.skills, card.x402`,
  python: `from payskill.a2a import AgentCard

card = await AgentCard.discover("https://pay")
# card.name, card.url, card.capabilities, card.skills, card.x402`,
  go: `card, err := payskill.DiscoverAgent(ctx, "https://pay")
// card.Name, card.URL, card.Capabilities, card.Skills, card.X402`,
  rust: `use payskill::a2a::AgentCard;

let card = AgentCard::discover("https://pay").await?;
// card.name, card.url, card.capabilities, card.skills, card.x402`,
  ruby: `card = Remitmd::AgentCard.discover("https://pay")
# card.name, card.url, card.capabilities, card.skills, card.x402`,
  csharp: `var card = await AgentCard.DiscoverAsync("https://pay");
// card.Name, card.Url, card.Capabilities, card.Skills, card.X402`,
  java: `var card = A2A.AgentCard.discover("https://pay").get();
// card.name(), card.url(), card.capabilities(), card.skills(), card.x402()`,
  swift: `let card = try await AgentCard.discover(
    baseURL: URL(string: "https://pay")!)
// card.name, card.url, card.capabilities, card.skills, card.x402`,
  elixir: `{:ok, card} = RemitMd.A2A.discover("https://pay")
# card.name, card.url, card.capabilities, card.skills, card.x402`,
});

reg("ap2-discovery", "parse-capabilities", {
  typescript: `// AP2 capabilities from the agent card
const caps = card.capabilities;
console.log("Streaming:", caps.streaming);
console.log("Extensions:", caps.extensions.map(e => e.uri));`,
  python: `# AP2 capabilities from the agent card
caps = card.capabilities
print("Streaming:", caps.streaming)
print("Extensions:", [e.uri for e in caps.extensions])`,
  go: `// AP2 capabilities from the agent card
caps := card.Capabilities
log.Printf("Streaming: %v", caps.Streaming)
for _, ext := range caps.Extensions {
    log.Printf("Extension: %s", ext.URI)
}`,
  rust: `// AP2 capabilities from the agent card
let caps = &card.capabilities;
println!("Streaming: {}", caps.streaming);
for ext in &caps.extensions {
    println!("Extension: {}", ext.uri);
}`,
  ruby: `# AP2 capabilities from the agent card
caps = card.capabilities
puts "Streaming: #{caps.streaming}"
caps.extensions.each { |e| puts "Extension: #{e.uri}" }`,
  csharp: `// AP2 capabilities from the agent card
var caps = card.Capabilities;
Console.WriteLine($"Streaming: {caps.Streaming}");
foreach (var ext in caps.Extensions)
    Console.WriteLine($"Extension: {ext.Uri}");`,
  java: `// AP2 capabilities from the agent card
var caps = card.capabilities();
System.out.printf("Streaming: %s%n", caps.streaming());
for (var ext : caps.extensions())
    System.out.printf("Extension: %s%n", ext.uri());`,
  swift: `// AP2 capabilities from the agent card
let caps = card.capabilities
print("Streaming: \\(caps.streaming)")
for ext in caps.extensions {
    print("Extension: \\(ext.uri)")
}`,
  elixir: `# AP2 capabilities from the agent card
caps = card.capabilities
IO.puts("Streaming: #{caps.streaming}")
for ext <- caps.extensions, do: IO.puts("Extension: #{ext.uri}")`,
});

reg("ap2-discovery", "enumerate-skills", {
  typescript: `// List all skills the agent can perform
for (const skill of card.skills) {
  console.log(\`[\${skill.id}] \${skill.name}: \${skill.description}\`);
  console.log("  Tags:", skill.tags.join(", "));
}`,
  python: `# List all skills the agent can perform
for skill in card.skills:
    print(f"[{skill.id}] {skill.name}: {skill.description}")
    print(f"  Tags: {', '.join(skill.tags)}")`,
  go: `// List all skills the agent can perform
for _, skill := range card.Skills {
    log.Printf("[%s] %s: %s", skill.ID, skill.Name, skill.Description)
    log.Printf("  Tags: %v", skill.Tags)
}`,
  rust: `// List all skills the agent can perform
for skill in &card.skills {
    println!("[{}] {}: {}", skill.id, skill.name, skill.description);
    println!("  Tags: {}", skill.tags.join(", "));
}`,
  ruby: `# List all skills the agent can perform
card.skills.each do |skill|
  puts "[#{skill.id}] #{skill.name}: #{skill.description}"
  puts "  Tags: #{skill.tags.join(', ')}"
end`,
  csharp: `// List all skills the agent can perform
foreach (var skill in card.Skills) {
    Console.WriteLine($"[{skill.Id}] {skill.Name}: {skill.Description}");
    Console.WriteLine($"  Tags: {string.Join(", ", skill.Tags)}");
}`,
  java: `// List all skills the agent can perform
for (var skill : card.skills()) {
    System.out.printf("[%s] %s: %s%n",
        skill.id(), skill.name(), skill.description());
    System.out.printf("  Tags: %s%n", String.join(", ", skill.tags()));
}`,
  swift: `// List all skills the agent can perform
for skill in card.skills {
    print("[\\(skill.id)] \\(skill.name): \\(skill.description)")
    print("  Tags: \\(skill.tags.joined(separator: ", "))")
}`,
  elixir: `# List all skills the agent can perform
for skill <- card.skills do
  IO.puts("[#{skill.id}] #{skill.name}: #{skill.description}")
  IO.puts("  Tags: #{Enum.join(skill.tags, ", ")}")
end`,
});

reg("ap2-discovery", "read-x402", {
  typescript: `// x402 payment parameters from the agent card
const x402 = card.x402;
console.log("Settle endpoint:", x402.settleEndpoint);
console.log("Assets:", Object.entries(x402.assets));
console.log("Fees:", x402.fees.standardBps, "bps standard");`,
  python: `# x402 payment parameters from the agent card
x402 = card.x402
print("Settle endpoint:", x402.get("settleEndpoint"))
print("Assets:", x402.get("assets"))
print("Fees:", x402.get("fees", {}).get("standardBps"), "bps standard")`,
  go: `// x402 payment parameters from the agent card
x402 := card.X402
log.Printf("Settle endpoint: %s", x402.SettleEndpoint)
log.Printf("Assets: %v", x402.Assets)
log.Printf("Fees: %d bps standard", x402.Fees.StandardBps)`,
  rust: `// x402 payment parameters from the agent card
let x402 = &card.x402;
println!("Settle endpoint: {}", x402.settle_endpoint);
println!("Assets: {:?}", x402.assets);
println!("Fees: {} bps standard", x402.fees.standard_bps);`,
  ruby: `# x402 payment parameters from the agent card
x402 = card.x402
puts "Settle endpoint: #{x402['settleEndpoint']}"
puts "Assets: #{x402['assets']}"
puts "Fees: #{x402['fees']['standardBps']} bps standard"`,
  csharp: `// x402 payment parameters from the agent card
var x402 = card.X402;
Console.WriteLine($"Settle endpoint: {x402.SettleEndpoint}");
Console.WriteLine($"Fees: {x402.Fees.StandardBps} bps standard");`,
  java: `// x402 payment parameters from the agent card
var x402 = card.x402();
System.out.printf("Settle endpoint: %s%n", x402.settleEndpoint());
System.out.printf("Fees: %d bps standard%n", x402.fees().standardBps());`,
  swift: `// x402 payment parameters from the agent card
let x402 = card.x402
print("Settle endpoint: \\(x402.settleEndpoint)")
print("Fees: \\(x402.fees.standardBps) bps standard")`,
  elixir: `# x402 payment parameters from the agent card
x402 = card.x402
IO.puts("Settle endpoint: #{x402["settleEndpoint"]}")
IO.puts("Fees: #{x402["fees"]["standardBps"]} bps standard")`,
});

reg("ap2-discovery", "summary", {
  typescript: `// Discovery complete - summarize the agent
console.log(\`Agent: \${card.name} (v\${card.version})\`);
console.log(\`Endpoint: \${card.url}\`);
console.log(\`Skills: \${card.skills.length}\`);
console.log(\`Docs: \${card.documentationUrl}\`);`,
  python: `# Discovery complete - summarize the agent
print(f"Agent: {card.name} (v{card.version})")
print(f"Endpoint: {card.url}")
print(f"Skills: {len(card.skills)}")
print(f"Docs: {card.documentation_url}")`,
  go: `// Discovery complete - summarize the agent
log.Printf("Agent: %s (v%s)", card.Name, card.Version)
log.Printf("Endpoint: %s", card.URL)
log.Printf("Skills: %d", len(card.Skills))
log.Printf("Docs: %s", card.DocumentationURL)`,
  rust: `// Discovery complete - summarize the agent
println!("Agent: {} (v{})", card.name, card.version);
println!("Endpoint: {}", card.url);
println!("Skills: {}", card.skills.len());
println!("Docs: {}", card.documentation_url);`,
  ruby: `# Discovery complete - summarize the agent
puts "Agent: #{card.name} (v#{card.version})"
puts "Endpoint: #{card.url}"
puts "Skills: #{card.skills.length}"
puts "Docs: #{card.documentation_url}"`,
  csharp: `// Discovery complete - summarize the agent
Console.WriteLine($"Agent: {card.Name} (v{card.Version})");
Console.WriteLine($"Endpoint: {card.Url}");
Console.WriteLine($"Skills: {card.Skills.Count}");
Console.WriteLine($"Docs: {card.DocumentationUrl}");`,
  java: `// Discovery complete - summarize the agent
System.out.printf("Agent: %s (v%s)%n", card.name(), card.version());
System.out.printf("Endpoint: %s%n", card.url());
System.out.printf("Skills: %d%n", card.skills().size());
System.out.printf("Docs: %s%n", card.documentationUrl());`,
  swift: `// Discovery complete - summarize the agent
print("Agent: \\(card.name) (v\\(card.version))")
print("Endpoint: \\(card.url)")
print("Skills: \\(card.skills.count)")
print("Docs: \\(card.documentationUrl)")`,
  elixir: `# Discovery complete - summarize the agent
IO.puts("Agent: #{card.name} (v#{card.version})")
IO.puts("Endpoint: #{card.url}")
IO.puts("Skills: #{length(card.skills)}")
IO.puts("Docs: #{card.documentation_url}")`,
});

// ════════════════════════════════════════════════════════════
// AP2 PAYMENT - A2A JSON-RPC payment flow
// ════════════════════════════════════════════════════════════

reg("ap2-payment", "discover", {
  typescript: `import { discoverAgent } from "@pay-skill/sdk";

const card = await discoverAgent("https://pay");
console.log("A2A endpoint:", card.url);`,
  python: `from payskill.a2a import AgentCard

card = await AgentCard.discover("https://pay")
print("A2A endpoint:", card.url)`,
  go: `card, err := payskill.DiscoverAgent(ctx, "https://pay")
log.Printf("A2A endpoint: %s", card.URL)`,
  rust: `let card = AgentCard::discover("https://pay").await?;
println!("A2A endpoint: {}", card.url);`,
  ruby: `card = Remitmd::AgentCard.discover("https://pay")
puts "A2A endpoint: #{card.url}"`,
  csharp: `var card = await AgentCard.DiscoverAsync("https://pay");
Console.WriteLine($"A2A endpoint: {card.Url}");`,
  java: `var card = A2A.AgentCard.discover("https://pay").get();
System.out.printf("A2A endpoint: %s%n", card.url());`,
  swift: `let card = try await AgentCard.discover(
    baseURL: URL(string: "https://pay")!)
print("A2A endpoint: \\(card.url)")`,
  elixir: `{:ok, card} = RemitMd.A2A.discover("https://pay")
IO.puts("A2A endpoint: #{card.url}")`,
});

reg("ap2-payment", "build-mandate", {
  typescript: `import { type IntentMandate } from "@pay-skill/sdk";

const mandate: IntentMandate = {
  mandateId: crypto.randomUUID(),
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  issuer: agent.address,
  allowance: { maxAmount: "10.00", currency: "USDC" },
};`,
  python: `from payskill.a2a import IntentMandate

mandate = IntentMandate(
    mandate_id=secrets.token_hex(16),
    expires_at=(datetime.utcnow() + timedelta(minutes=5)).isoformat() + "Z",
    issuer=agent.address,
    max_amount="10.00",
)`,
  go: `mandate := &payskill.IntentMandate{
    MandateID: uuid.New().String(),
    ExpiresAt: time.Now().Add(5 * time.Minute).Format(time.RFC3339),
    Issuer:    agent.Address(),
    Allowance: payskill.IntentMandateAllowance{
        MaxAmount: "10.00", Currency: "USDC",
    },
}`,
  rust: `let mandate = IntentMandate {
    mandate_id: uuid::Uuid::new_v4().to_string(),
    expires_at: (SystemTime::now() + Duration::from_secs(300))
        .duration_since(UNIX_EPOCH)?.as_secs().to_string(),
    issuer: agent.address().to_string(),
    allowance: IntentMandateAllowance {
        max_amount: "10.00".into(), currency: "USDC".into(),
    },
};`,
  ruby: `mandate = Remitmd::IntentMandate.new(
  mandate_id: SecureRandom.uuid,
  expires_at: (Time.now + 300).utc.iso8601,
  issuer: agent.address,
  max_amount: "10.00",
)`,
  csharp: `var mandate = new IntentMandate(
    MandateId: Guid.NewGuid().ToString(),
    ExpiresAt: DateTime.UtcNow.AddMinutes(5).ToString("o"),
    Issuer: agent.Address,
    Allowance: new IntentMandateAllowance("10.00", "USDC"));`,
  java: `var mandate = new A2A.IntentMandate(
    UUID.randomUUID().toString(),
    Instant.now().plusSeconds(300).toString(),
    agent.address(),
    Map.of("maxAmount", "10.00", "currency", "USDC"));`,
  swift: `let mandate = IntentMandate(
    mandateId: UUID().uuidString,
    expiresAt: ISO8601DateFormatter().string(
        from: Date().addingTimeInterval(300)),
    issuer: agent.address,
    allowance: IntentAllowance(maxAmount: "10.00", currency: "USDC"))`,
  elixir: `mandate = RemitMd.A2A.IntentMandate.new(
  mandate_id: :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower),
  expires_at: DateTime.utc_now() |> DateTime.add(300) |> DateTime.to_iso8601(),
  issuer: agent.address,
  max_amount: "10.00")`,
});

reg("ap2-payment", "sign-permit", {
  typescript: `const permit = await agent.signPermit("direct", 10.00);`,
  python: `permit = await agent.sign_permit("direct", 10.00)`,
  go: `permit, err := agent.SignPermit(ctx, "direct", 10.00)`,
  rust: `let permit = agent.sign_permit("direct", 10.00).await?;`,
  ruby: `permit = agent.sign_permit("direct", 10.00)`,
  csharp: `var permit = await agent.SignPermitAsync("direct", 10.00m);`,
  java: `var permit = agent.signPermit("direct", 10.00);`,
  swift: `let permit = try await agent.signPermit(flow: "direct", amount: 10.00)`,
  elixir: `{:ok, permit} = Remitmd.sign_permit(agent, "direct", 10.00)`,
});

reg("ap2-payment", "send-message", {
  typescript: `import { A2AClient, getTaskTxHash } from "@pay-skill/sdk";

const a2a = A2AClient.fromCard(card, signer);
const task = await a2a.send({
  to: provider.address, amount: 10.00,
  memo: "ap2-task-payment:playground", mandate,
});
console.log("Task:", task.id, "State:", task.status.state);`,
  python: `from payskill.a2a import A2AClient

async with A2AClient.from_wallet(card, agent) as a2a:
    task = await a2a.send(
        to=provider.address, amount=10.00,
        memo="ap2-task-payment:playground", mandate=mandate)
    print(f"Task: {task.id} State: {task.state}")`,
  go: `a2a, err := payskill.A2AClientFromCard(card, signer)
task, err := a2a.Send(ctx, payskill.SendOptions{
    To: provider.Address, Amount: 10.00,
    Memo: "ap2-task-payment:playground", Mandate: mandate,
})
log.Printf("Task: %s State: %s", task.ID, task.Status.State)`,
  rust: `let a2a = A2AClient::from_card(&card, signer);
let task = a2a.send(SendOptions {
    to: provider.address().into(), amount: 10.00,
    memo: Some("ap2-task-payment:playground".into()),
    mandate: Some(mandate),
}).await?;
println!("Task: {} State: {}", task.id, task.status.state);`,
  ruby: `a2a = Remitmd::A2AClient.from_card(card, signer)
task = a2a.send(
  to: provider.address, amount: 10.00,
  memo: "ap2-task-payment:playground", mandate: mandate)
puts "Task: #{task.id} State: #{task.state}"`,
  csharp: `var a2a = A2AClient.FromCard(card, signer);
var task = await a2a.SendAsync(
    provider.Address, 10.00m, "ap2-task-payment:playground", mandate);
Console.WriteLine($"Task: {task.Id} State: {task.Status.State}");`,
  java: `var a2a = A2A.Client.fromCard(card, signer);
var task = a2a.send(new A2A.SendOptions(
    provider.address(), 10.00, "ap2-task-payment:playground", mandate));
System.out.printf("Task: %s State: %s%n",
    task.id(), task.status().state());`,
  swift: `let a2a = A2AClient.fromCard(card, signer: signer)
let task = try await a2a.send(A2ASendOptions(
    to: provider.address, amount: 10.00,
    memo: "ap2-task-payment:playground", mandate: mandate))
print("Task: \\(task.id) State: \\(task.status.state)")`,
  elixir: `{:ok, a2a} = RemitMd.A2A.Client.from_card(card, signer)
{:ok, task} = RemitMd.A2A.Client.send(a2a,
  to: provider.address, amount: 10.00,
  memo: "ap2-task-payment:playground", mandate: mandate)
IO.puts("Task: #{task.id} State: #{task.state}")`,
});

reg("ap2-payment", "verify-task", {
  typescript: `const verified = await a2a.getTask(task.id);
const txHash = getTaskTxHash(verified);
console.log("State:", verified.status.state);
console.log("Tx hash:", txHash);`,
  python: `verified = await a2a.get(task.id)
print(f"State: {verified.state}")
print(f"Tx hash: {verified.tx_hash}")`,
  go: `verified, err := a2a.GetTask(ctx, task.ID)
txHash := payskill.GetTaskTxHash(verified)
log.Printf("State: %s  Tx: %s", verified.Status.State, txHash)`,
  rust: `let verified = a2a.get_task(&task.id).await?;
let tx_hash = get_task_tx_hash(&verified);
println!("State: {}  Tx: {:?}", verified.status.state, tx_hash);`,
  ruby: `verified = a2a.get_task(task.id)
puts "State: #{verified.state}"
puts "Tx hash: #{verified.tx_hash}"`,
  csharp: `var verified = await a2a.GetTaskAsync(task.Id);
var txHash = verified.GetTxHash();
Console.WriteLine($"State: {verified.Status.State}  Tx: {txHash}");`,
  java: `var verified = a2a.getTask(task.id());
var txHash = A2A.getTaskTxHash(verified);
System.out.printf("State: %s  Tx: %s%n",
    verified.status().state(), txHash);`,
  swift: `let verified = try await a2a.getTask(taskId: task.id)
let txHash = verified.getTxHash()
print("State: \\(verified.status.state)  Tx: \\(txHash ?? "pending")")`,
  elixir: `{:ok, verified} = RemitMd.A2A.Client.get_task(a2a, task.id)
tx_hash = RemitMd.A2A.Task.get_tx_hash(verified)
IO.puts("State: #{verified.state}  Tx: #{tx_hash}")`,
});

wh("ap2-payment", "webhook-sent", "payment.sent", "AP2 payment sent");
wh("ap2-payment", "webhook-received", "payment.received", "AP2 payment received");
