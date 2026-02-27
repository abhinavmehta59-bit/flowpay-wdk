# FlowPay — Hackathon Build Plan
## Tether Galactica WDK Edition 1 | Deadline: March 22, 2026

## What We're Submitting
**FlowPay** — An AI agent that holds a self-custodial wallet, receives payment 
instructions via natural language (through OpenClaw/Telegram), enforces a rule engine, 
and executes cross-border USDC transfers gaslessly via WDK + ERC-4337.

This hits BOTH prize tracks:
- 🤖 Agent Wallets (WDK + OpenClaw integration) → $3,000
- 🏆 Best Overall → $6,000

## The Demo Flow (what judges will see)
1. User sends Telegram message: "Send 50 USDC to 0xABC... for invoice #42"
2. OpenClaw (Jarvis) parses intent → validates against rule engine
3. Rule engine checks: amount limit ✅, recipient known ✅, balance sufficient ✅
4. WDK ERC-4337 wallet signs + submits transaction (no ETH needed)
5. Aave module: idle funds auto-deposited for yield between payments
6. Jarvis confirms on Telegram: "✅ Sent 50 USDC. Tx: 0x..."

## Build Checklist

### Phase 1 — Core (NOW → Mar 7)
- [ ] Fix server.js — clean up config, test wallet create/load
- [ ] Add /api/send endpoint — gasless USDC transfer via ERC-4337
- [ ] Add /api/aave/deposit + /api/aave/balance — yield on idle funds
- [ ] End-to-end testnet flow working (receive USDC → send → check yield)
- [ ] OpenClaw skill: Jarvis can send USDC via Telegram command
- [ ] Register on DoraHacks

### Phase 2 — Polish (Mar 8-14)  
- [ ] Rule engine: amount limits, whitelist, daily caps
- [ ] UI: send transaction form, Aave yield display, tx history
- [ ] Multi-agent: separate wallets per "agent" (salary agent, remittance agent)
- [ ] Proper seed encryption using wdk-secret-manager

### Phase 3 — Submission (Mar 15-22)
- [ ] 3-min video demo
- [ ] README + architecture diagram
- [ ] DoraHacks submission write-up
- [ ] Deploy to a public URL (not just localhost)

## Tech Stack
- WDK: wallet creation, EVM signing, ERC-4337 gasless
- Aave module: yield on idle USDC
- USDT0 bridge: cross-chain (stretch goal)
- OpenClaw: Jarvis as the AI agent interface (Telegram)
- Express: API server
- Viem: on-chain reads
- Rule engine: simple JSON config (no LLM touches payments)
