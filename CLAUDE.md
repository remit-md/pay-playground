# pay-playground

Interactive demo for pay. 3 flows: direct, tab, x402.

## Reference
- Remit playground: `C:\Users\jj\remit-playground\` (frozen, reference only)
- Dev guide: `C:\Users\jj\payskill\spec\guides\FRONTEND.md`
- General guide: `C:\Users\jj\payskill\spec\guides\GENERAL.md`
- Project spec: `C:\Users\jj\payskill\spec\CLAUDE.md`

## Quick Rules
- Vanilla TypeScript, NO frameworks
- Vite bundler, minimal CSS
- Strict mode, no `any`
- Pre-commit: `tsc --noEmit` + `vite build`
- Uses the TypeScript SDK (not raw API calls) — proves the SDK works
- Each flow is self-contained
- Shows transaction details + webhook events in real-time
- 3 flows only: direct payment, tab lifecycle, x402 paywall
- No hardcoded addresses/URLs
- Functions ≤ 40 lines, files ≤ 300 lines
