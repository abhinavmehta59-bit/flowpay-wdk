# FlowPay Enhanced — Hackathon Ready

## 🚀 What's New

### MCP Toolkit Integration
- **35 tools** across **13 chains**
- Chains: Ethereum, Arbitrum, Polygon, Optimism, Base, Avalanche, BNB, Bitcoin, Solana, TON, Tron, Plasma, Stable
- Tool categories: Wallet, Pricing, Indexer, Swap, Bridge, Lending
- API: `GET /api/mcp/tools` — Check MCP status
- API: `GET /api/mcp/balance/:chain/:address` — Multi-chain balances

### x402 Micropayments
- AI-native payment protocol (HTTP 402)
- Premium endpoint: `POST /api/premium-intent` — $0.01 per request
- Supports Plasma and Stable chains
- EIP-3009 gasless payments

### Existing Features (Still Work)
- ERC-4337 smart wallet on Arbitrum
- Gasless USDT transfers
- Natural language intent parsing
- Aave yield integration

## 🎯 Hackathon Submission Points

1. **WDK Core** — ERC-4337 smart wallet ✅
2. **MCP Toolkit** — 35 tools, 13 chains ✅  
3. **x402** — AI micropayments ✅
4. **OpenClaw Integration** — AI agent control ✅

## 🏃 Quick Start

```bash
cd flowpay-wdk
node server-enhanced.js
```

Open http://localhost:3456

## 📊 Demo Flow

1. **Create wallet** → Shows 3 addresses (ETH, Arbitrum, Smart Wallet)
2. **Check balances** → USDT + ETH on Arbitrum
3. **MCP Toolkit** → 35 tools across 13 chains
4. **x402 Payment** → Test premium intent ($0.01)
5. **Send USDT** → Gasless via ERC-4337

## 🎥 Video Script (2 min)

1. **Intro** (15s): "FlowPay — AI agent wallet with MCP toolkit and x402"
2. **Wallet** (30s): Create wallet, show multi-chain addresses
3. **MCP** (30s): "35 tools across 13 chains" — check status
4. **x402** (30s): Demo premium intent with $0.01 payment
5. **Send** (15s): Gasless USDT transfer
6. **Outro** (10s): "Built with WDK for Tether Galactica"

## 📝 DoraHacks Submission

**Title:** FlowPay — AI Agent Wallet with MCP Toolkit & x402

**Description:**
FlowPay is an AI-native payment platform built on WDK. It features:
- Self-custodial ERC-4337 smart wallets
- MCP Toolkit integration (35 tools, 13 chains)
- x402 micropayments for AI-to-AI transactions
- Natural language payment intents
- Gasless USDT transfers on Arbitrum

**Track:** Agent Wallets (WDK / OpenClaw)

**Demo:** [Link to deployed app or video]

**GitHub:** https://github.com/abhinavmehta59-bit/flowpay-wdk
